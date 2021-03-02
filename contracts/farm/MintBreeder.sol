// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/utils/EnumerableSet.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../token/MintToken.sol";

// Copied and modified from sushiswap code:
// https://github.com/sushiswap/sushiswap/blob/master/contracts/MasterChef.sol

interface IMigrator {
    function replaceMigrate(IERC20 lpToken) external returns (IERC20, uint);

    function migrate(IERC20 lpToken) external returns (IERC20, uint);
}

// MintBreeder is the master of MintToken.
contract MintBreeder is Ownable {

    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    // Info of each user.
    struct UserInfo {
        uint256 amount;     // How many LP tokens the user has provided.
        uint256 rewardDebt; // Reward debt.
        uint256 pendingReward;
        bool unStakeBeforeEnableClaim;
    }

    // Info of each pool.
    struct PoolInfo {
        IERC20 lpToken;           // Address of LP token contract.
        uint256 allocPoint;       // How many allocation points assigned to this pool. MintTokens to distribute per block.
        uint256 lastRewardBlock;  // Last block number that MintTokens distribution occurs.
        uint256 accMintPerShare; // Accumulated MintTokens per share, times 1e12. See below.
        uint256 totalDeposit;       // Accumulated deposit tokens.
        IMigrator migrator;
    }

    // The WeMintToken !
    MintToken public mint;

    // Dev address.
    address public devAddr;

    // Percentage of developers mining
    uint256 public devMiningRate;

    // Mint tokens created per block.
    uint256 public mintPerBlock;

    // The block number when WPC mining starts.
    uint256 public startBlock;

    // The block number when WPC claim starts.
    uint256 public enableClaimBlock;

    // Interval blocks to reduce mining volume.
    uint256 public reduceIntervalBlock;

    // reduce rate
    uint256 public reduceRate;

    // Info of each pool.
    PoolInfo[] public poolInfo;

    // Info of each user that stakes LP tokens.
    mapping(uint256 => mapping(address => UserInfo)) public userInfo;
    mapping(uint256 => address[]) public userAddresses;

    // Total allocation points. Must be the sum of all allocation points in all pools.
    uint256 public totalAllocPoint;

    event Stake(address indexed user, uint256 indexed pid, uint256 amount);
    event Claim(address indexed user, uint256 indexed pid);
    event UnStake(address indexed user, uint256 indexed pid, uint256 amount);
    event EmergencyWithdraw(address indexed user, uint256 indexed pid, uint256 amount);
    event ReplaceMigrate(address indexed user, uint256 pid, uint256 amount);
    event Migrate(address indexed user, uint256 pid, uint256 targetPid, uint256 amount);

    constructor (
        MintToken _mint,
        address _devAddr,
        uint256 _mintPerBlock,
        uint256 _startBlock,
        uint256 _enableClaimBlock,
        uint256 _reduceIntervalBlock,
        uint256 _reduceRate,
        uint256 _devMiningRate
    ) public {
        mint = _mint;
        devAddr = _devAddr;
        mintPerBlock = _mintPerBlock;
        startBlock = _startBlock;
        reduceIntervalBlock = _reduceIntervalBlock;
        reduceRate = _reduceRate;
        devMiningRate = _devMiningRate;
        enableClaimBlock = _enableClaimBlock;

        totalAllocPoint = 0;
    }

    function poolLength() external view returns (uint256) {
        return poolInfo.length;
    }

    function usersLength(uint256 _pid) external view returns (uint256) {
        return userAddresses[_pid].length;
    }

    // Update dev address by the previous dev.
    function setDevAddr(address _devAddr) public onlyOwner {
        devAddr = _devAddr;
    }

    // Set the migrator contract. Can only be called by the owner.
    function setMigrator(uint256 _pid, IMigrator _migrator) public onlyOwner {
        poolInfo[_pid].migrator = _migrator;
    }

    // set the enable claim block
    function setEnableClaimBlock(uint256 _enableClaimBlock) public onlyOwner {
        enableClaimBlock = _enableClaimBlock;
    }

    // update reduceIntervalBlock
    function setReduceIntervalBlock(uint256 _reduceIntervalBlock, bool _withUpdate) public onlyOwner {
        if (_withUpdate) {
            massUpdatePools();
        }
        reduceIntervalBlock = _reduceIntervalBlock;
    }

    // Update the given pool's Mint allocation point. Can only be called by the owner.
    function setAllocPoint(uint256 _pid, uint256 _allocPoint, bool _withUpdate) public onlyOwner {
        if (_withUpdate) {
            massUpdatePools();
        }
        //update totalAllocPoint
        totalAllocPoint = totalAllocPoint.sub(poolInfo[_pid].allocPoint).add(_allocPoint);

        //update poolInfo
        poolInfo[_pid].allocPoint = _allocPoint;
    }

    // update reduce rate
    function setReduceRate(uint256 _reduceRate, bool _withUpdate) public onlyOwner {
        if (_withUpdate) {
            massUpdatePools();
        }
        reduceRate = _reduceRate;
    }

    // update dev mining rate
    function setDevMiningRate(uint256 _devMiningRate) public onlyOwner {
        devMiningRate = _devMiningRate;
    }

    // Migrate lp token to another lp contract.
    function replaceMigrate(uint256 _pid) public onlyOwner {
        PoolInfo storage pool = poolInfo[_pid];
        IMigrator migrator = pool.migrator;
        require(address(migrator) != address(0), "migrate: no migrator");

        IERC20 lpToken = pool.lpToken;
        uint256 bal = lpToken.balanceOf(address(this));
        lpToken.safeApprove(address(migrator), bal);
        (IERC20 newLpToken, uint mintBal) = migrator.replaceMigrate(lpToken);

        require(bal == newLpToken.balanceOf(address(this)), "migrate: bad");
        pool.lpToken = newLpToken;

        emit ReplaceMigrate(address(migrator), _pid, bal);
    }

    // Move lp token data to another lp contract.
    function migrate(uint256 _pid, uint256 _targetPid, uint256 begin) public onlyOwner {

        require(begin < userAddresses[_pid].length, "migrate: begin error");

        PoolInfo storage pool = poolInfo[_pid];
        IMigrator migrator = pool.migrator;
        require(address(migrator) != address(0), "migrate: no migrator");

        IERC20 lpToken = pool.lpToken;
        uint256 bal = lpToken.balanceOf(address(this));
        lpToken.safeApprove(address(migrator), bal);
        (IERC20 newLpToken, uint mintBal) = migrator.migrate(lpToken);

        PoolInfo storage targetPool = poolInfo[_targetPid];
        require(address(targetPool.lpToken) == address(newLpToken), "migrate: bad");

        uint rate = mintBal.mul(1e12).div(bal);
        for (uint i = begin; i < begin.add(20); i++) {

            if (i < userAddresses[_pid].length) {
                updatePool(_targetPid);

                address addr = userAddresses[_pid][i];
                UserInfo storage user = userInfo[_pid][addr];
                UserInfo storage tUser = userInfo[_targetPid][addr];

                if (user.amount <= 0) {
                    continue;
                }

                uint tmp = user.amount.mul(rate).div(1e12);

                tUser.amount = tUser.amount.add(tmp);
                tUser.rewardDebt = tUser.rewardDebt.add(user.rewardDebt.mul(rate).div(1e12));
                targetPool.totalDeposit = targetPool.totalDeposit.add(tmp);
                pool.totalDeposit = pool.totalDeposit.sub(user.amount);
                user.rewardDebt = 0;
                user.amount = 0;
            } else {
                break;
            }

        }

        emit Migrate(address(migrator), _pid, _targetPid, bal);

    }

    // Safe mint transfer function, just in case if rounding error causes pool to not have enough MintToken.
    function safeMintTransfer(address _to, uint256 _amount) internal {
        uint256 mintBal = mint.balanceOf(address(this));
        if (_amount > mintBal) {
            mint.transfer(_to, mintBal);
        } else {
            mint.transfer(_to, _amount);
        }
    }

    // Return mintPerBlock, baseOn power  --> mintPerBlock * (reduceRate/100)^power
    function getMintPerBlock(uint256 _power) public view returns (uint256){
        if (_power == 0) {
            return mintPerBlock;
        } else {
            uint256 z = mintPerBlock;
            for (uint256 i = 0; i < _power; i++) {
                z = z.mul(reduceRate).div(1000);
            }
            return z;
        }
    }

    // Return reward multiplier over the given _from to _to block.
    function getMultiplier(uint256 _from, uint256 _to) public pure returns (uint256) {
        return _to.sub(_from);
    }

    // View function to see all pending MintToken on frontend.
    function allPendingMint(address _user) external view returns (uint256){
        uint sum = 0;
        for (uint i = 0; i < poolInfo.length; i++) {
            sum = sum.add(_pending(i, _user));
        }
        return sum;
    }

    // View function to see pending MintToken on frontend.
    function pendingMint(uint256 _pid, address _user) external view returns (uint256) {
        return _pending(_pid, _user);
    }

    //internal function
    function _pending(uint256 _pid, address _user) internal view returns (uint256) {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][_user];

        uint256 accMintPerShare = pool.accMintPerShare;
        uint256 lpSupply = pool.lpToken.balanceOf(address(this));

        if (block.number > pool.lastRewardBlock && lpSupply != 0) {
            // pending mint reward
            uint256 mintReward = 0;
            uint256 lastRewardBlockPower = pool.lastRewardBlock.sub(startBlock).div(reduceIntervalBlock);
            uint256 blockNumberPower = block.number.sub(startBlock).div(reduceIntervalBlock);

            // get mintReward from pool.lastRewardBlock to block.number.
            // different interval different multiplier and mintPerBlock, sum mintReward
            if (lastRewardBlockPower == blockNumberPower) {
                uint256 multiplier = getMultiplier(pool.lastRewardBlock, block.number);
                mintReward = mintReward.add(multiplier.mul(getMintPerBlock(blockNumberPower)).mul(pool.allocPoint).div(totalAllocPoint));
            } else {
                for (uint256 i = lastRewardBlockPower; i <= blockNumberPower; i++) {
                    uint256 multiplier = 0;
                    if (i == lastRewardBlockPower) {
                        multiplier = getMultiplier(pool.lastRewardBlock, startBlock.add(lastRewardBlockPower.add(1).mul(reduceIntervalBlock)).sub(1));
                    } else if (i == blockNumberPower) {
                        multiplier = getMultiplier(startBlock.add(blockNumberPower.mul(reduceIntervalBlock)), block.number);
                    } else {
                        multiplier = reduceIntervalBlock;
                    }
                    mintReward = mintReward.add(multiplier.mul(getMintPerBlock(i)).mul(pool.allocPoint).div(totalAllocPoint));
                }
            }

            accMintPerShare = accMintPerShare.add(mintReward.mul(1e12).div(lpSupply));
        }

        // get pending value
        uint256 pendingValue = user.amount.mul(accMintPerShare).div(1e12).sub(user.rewardDebt);

        // if enableClaimBlock after block.number, return pendingValue + user.pendingReward.
        // else return pendingValue.
        if (enableClaimBlock > block.number) {
            return pendingValue.add(user.pendingReward);
        } else if (user.pendingReward > 0 && user.unStakeBeforeEnableClaim) {
            return pendingValue.add(user.pendingReward);
        }
        return pendingValue;
    }

    // Update reward variables for all pools. Be careful of gas spending!
    function massUpdatePools() public {
        uint256 length = poolInfo.length;
        for (uint256 pid = 0; pid < length; ++pid) {
            updatePool(pid);
        }
    }

    // Update reward variables of the given pool to be up-to-date.
    function updatePool(uint256 _pid) public {

        PoolInfo storage pool = poolInfo[_pid];
        if (block.number <= pool.lastRewardBlock) {
            return;
        }

        uint256 lpSupply = pool.lpToken.balanceOf(address(this));
        if (lpSupply == 0) {
            pool.lastRewardBlock = block.number;
            return;
        }

        // get mintReward. mintReward base on current MintPerBlock.
        uint256 power = block.number.sub(startBlock).div(reduceIntervalBlock);
        uint256 multiplier = getMultiplier(pool.lastRewardBlock, block.number);
        uint256 mintReward = multiplier.mul(getMintPerBlock(power)).mul(pool.allocPoint).div(totalAllocPoint);

        // mint
        mint.mint(devAddr, mintReward.mul(devMiningRate).div(100));
        mint.mint(address(this), mintReward);

        //update pool
        pool.accMintPerShare = pool.accMintPerShare.add(mintReward.mul(1e12).div(lpSupply));
        pool.lastRewardBlock = block.number;

    }

    // Add a new lp to the pool. Can only be called by the owner.
    // DO NOT add the same LP token more than once. Rewards will be messed up if you do.
    function add(uint256 _allocPoint, IERC20 _lpToken, IMigrator _migrator, bool _withUpdate) public onlyOwner {

        if (_withUpdate) {
            massUpdatePools();
        }

        uint256 lastRewardBlock = block.number > startBlock ? block.number : startBlock;

        //update totalAllocPoint
        totalAllocPoint = totalAllocPoint.add(_allocPoint);

        // add poolInfo
        poolInfo.push(PoolInfo({
        lpToken : _lpToken,
        allocPoint : _allocPoint,
        lastRewardBlock : lastRewardBlock,
        accMintPerShare : 0,
        totalDeposit : 0,
        migrator : _migrator
        }));
    }

    // Stake LP tokens to MintBreeder for MC allocation.
    function stake(uint256 _pid, uint256 _amount) public {

        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];

        //update poolInfo by pid
        updatePool(_pid);

        // if user's amount bigger than zero, transfer MintToken to user.
        if (user.amount > 0) {
            uint256 pending = user.amount.mul(pool.accMintPerShare).div(1e12).sub(user.rewardDebt);
            if (pending > 0) {
                // if enableClaimBlock after block.number, save the pending to user.pendingReward.
                if (enableClaimBlock <= block.number) {
                    safeMintTransfer(msg.sender, pending);

                    // transfer user.pendingReward if user.pendingReward > 0, and update user.pendingReward to 0
                    if (user.pendingReward > 0) {
                        safeMintTransfer(msg.sender, user.pendingReward);
                        user.pendingReward = 0;
                    }
                } else {
                    user.pendingReward = user.pendingReward.add(pending);
                }
            }
        }

        if (_amount > 0) {
            pool.lpToken.safeTransferFrom(address(msg.sender), address(this), _amount);
            user.amount = user.amount.add(_amount);
            pool.totalDeposit = pool.totalDeposit.add(_amount);
            userAddresses[_pid].push(msg.sender);
        }

        user.rewardDebt = user.amount.mul(pool.accMintPerShare).div(1e12);

        emit Stake(msg.sender, _pid, _amount);

    }

    // UnStake LP tokens from MintBreeder.
    function unStake(uint256 _pid, uint256 _amount) public {

        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];

        require(user.amount >= _amount, "unStake: not good");

        //update poolInfo by pid
        updatePool(_pid);

        //transfer MintToken to user.
        uint256 pending = user.amount.mul(pool.accMintPerShare).div(1e12).sub(user.rewardDebt);
        if (pending > 0) {
            // if enableClaimBlock after block.number, save the pending to user.pendingReward.
            if (enableClaimBlock <= block.number) {
                safeMintTransfer(msg.sender, pending);

                // transfer user.pendingReward if user.pendingReward > 0, and update user.pendingReward to 0
                if (user.pendingReward > 0) {
                    safeMintTransfer(msg.sender, user.pendingReward);
                    user.pendingReward = 0;
                }
            } else {
                user.pendingReward = user.pendingReward.add(pending);
                user.unStakeBeforeEnableClaim = true;
            }
        }

        if (_amount > 0) {
            // transfer LP tokens to user
            pool.lpToken.safeTransfer(address(msg.sender), _amount);
            // update user info
            user.amount = user.amount.sub(_amount);
            pool.totalDeposit = pool.totalDeposit.sub(_amount);
        }

        user.rewardDebt = user.amount.mul(pool.accMintPerShare).div(1e12);

        emit UnStake(msg.sender, _pid, _amount);
    }

    // claim WPC
    function claim(uint256 _pid) public {

        require(enableClaimBlock <= block.number, "too early to claim");

        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];

        //update poolInfo by pid
        updatePool(_pid);

        // if user's amount bigger than zero, transfer MintToken to user.
        if (user.amount > 0) {
            uint256 pending = user.amount.mul(pool.accMintPerShare).div(1e12).sub(user.rewardDebt);
            if (pending > 0) {
                safeMintTransfer(msg.sender, pending);
            }
        }

        // transfer user.pendingReward if user.pendingReward > 0, and update user.pendingReward to 0
        if (user.pendingReward > 0) {
            safeMintTransfer(msg.sender, user.pendingReward);
            user.pendingReward = 0;
        }

        // update user info
        user.rewardDebt = user.amount.mul(pool.accMintPerShare).div(1e12);

        emit Claim(msg.sender, _pid);
    }

    // Withdraw without caring about rewards. EMERGENCY ONLY.
    function emergencyWithdraw(uint256 _pid) public {

        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];

        uint256 amount = user.amount;

        // transfer LP tokens to user
        pool.lpToken.safeTransfer(address(msg.sender), amount);

        pool.totalDeposit = pool.totalDeposit.sub(user.amount);
        // update user info
        user.amount = 0;
        user.rewardDebt = 0;

        emit EmergencyWithdraw(msg.sender, _pid, amount);
    }


}
