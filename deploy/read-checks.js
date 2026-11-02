const {ethers}=require("ethers");
(async()=>{
const p=new ethers.JsonRpcProvider("https://bsc-dataseed.binance.org",56);
const tx="0x30cc04a50ff0b162b43634331cf6ffa4bc85dd5147dd206f05837c4653ebd3b7";
const r=await p.waitForTransaction(tx,1,180000);
console.log("status",r.status,"block",r.blockNumber,"gasUsed",r.gasUsed.toString(),"gasPrice",r.gasPrice.toString(),"fee BNB",ethers.formatEther(r.gasUsed*r.gasPrice),"from",r.from,"to",r.to);
const A="0xcd4472Af68801DE87E970A333C71da5d12E825A3";
const code=await p.getCode(A);const fs=require("fs");
const out=JSON.parse(require("child_process").execFileSync(process.env.SOLC,["--standard-json"],{input:fs.readFileSync("deploy/AgenticBull.standard-input.json"),maxBuffer:1<<28})).contracts["flat/AgenticBull.flat.sol"].AgenticBull;
{const a=code.slice(2),b=out.evm.deployedBytecode.object;let d=[];for(let i=0;i<a.length;i+=2)if(a.substr(i,2)!==b.substr(i,2))d.push(i/2);console.log("differing byte offsets",d.length,d.slice(0,40).join(","));}
console.log("runtime bytes",(code.length-2)/2,"matches compiled:",code.slice(2)===out.evm.deployedBytecode.object);
const c=new ethers.Contract(A,require("./AgenticBull.abi.json"),p);
for(const f of ["totalMinted","freeMinted","MINT_START","FREE_CAP","PRICE","PRICE_THIRD","MAX_PER_WALLET","MAX_PER_AGENT","name","symbol"]){try{console.log(f,(await c[f]()).toString())}catch(e){console.log(f,"ERR",e.shortMessage)}}
for(const f of ["registry","REGISTRY"]){try{console.log(f,await c[f]())}catch(e){}}
for(let i=1;i<=5;i++)console.log("ownerOf",i,await c.ownerOf(i));
const j=JSON.parse(Buffer.from((await c.contractURI()).split(",")[1],"base64").toString());
console.log("contractURI",JSON.stringify(j,null,1).replace(/"image": "[^"]{80}[^"]*"/,'"image": "<data…>"'));
console.log("desc exact:",j.description==="3,000 Agentic Bulls on BNB Chain, minted only by .ai Agent IDs. The first 900 Agent IDs get their first bull free. Other bulls are 0.00028 BNB and the third is 0.00035 BNB, up to 3 per Agent ID. Revealed instantly.");
})();
