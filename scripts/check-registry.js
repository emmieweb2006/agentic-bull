const {ethers}=require("ethers");
(async()=>{
 for (const url of ["https://bsc-dataseed.binance.org","https://bsc-rpc.publicnode.com"]) {
 try{
 const p=new ethers.JsonRpcProvider(url,56,{staticNetwork:true});
 const reg="0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F", pay="0x5ec628f3339B1fEC2e8572a5b307932cC3bCdd1a";
 const code=await p.getCode(reg); console.log(url,"registry code bytes:",(code.length-2)/2);
 const pc=await p.getCode(pay); console.log("payout code:",pc, (pc.length-2)/2);
 const c=new ethers.Contract(reg,["function handleOf(address) view returns (string)"],p);
 console.log("handleOf(payout):",JSON.stringify(await c.handleOf(pay)));
 console.log("handleOf(0x..dEaD):",JSON.stringify(await c.handleOf("0x000000000000000000000000000000000000dEaD")));
 console.log("nonce payout:", await p.getTransactionCount(pay));
 break;
 }catch(e){console.log(url,"ERR",e.shortMessage||e.message)}
 }
})();
