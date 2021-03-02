## Mint 

mint token

```js
oz init
```

networks.js
https://docs.openzeppelin.com/cli/2.8/truffle

create2
https://ethfans.org/posts/getting-the-most-out-of-create2
## Run

### node run
支持 console.log 的节点节点环境 `npx buidler node`
```js 
  npx buidler help
  node scripts/sample-script.js //未通过
```

### compile
根据 solidity 版本编译代码
> 注意 Mint Token 中的 get chainid的操作码无法通过编译需要修改一下。

### test
```js
 let rolsSha3 = web3.utils.soliditySha3("MINTER_ROLE")
 // 0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6
```


### deploy
ropsten网络
### 合约地址
>mintToken 0x8936E7208F94b7a8F77fa2dA139513d02c3B7431
https://ropsten.etherscan.io/address/0x8936E7208F94b7a8F77fa2dA139513d02c3B7431#contracts
 
>mintBreeder 0xD99501cEC2D253B918a6af1928Fa1272a9f231fE
 https://ropsten.etherscan.io/address/0xD99501cEC2D253B918a6af1928Fa1272a9f231fE#contracts
 
### 矿池
* aDaiToken: "0xF8dAcF50a51722C7b37F600D924B14Af9382EFC1"
* aUSDTToken: "0x5e5Fbc55b93e77a60BfFA9c50A6524ACDe1496a8"
 
### 起始挖矿块高：9052810

### 解锁收益块高: 9052910



### verfiy code 
必须使用 Truffle 进行发布后才能进行验证。 注需要翻墙使用
```
truffle run verify MintToken --network ropsten
truffle run verify MintBreeder --network ropsten
```

### Remix
```js
truffle-flattener contracts/token/MintToken.sol > flattener/MintToken.sol
truffle-flattener contracts/farm/MintBreeder.sol > flattener/MintBreeder.sol
```
 
 


