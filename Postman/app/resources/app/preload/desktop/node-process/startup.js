global.pm||(global.pm={}),pm.name=process.env.pm_name,pm.logPath=process.env.pm_logPath,pm.entryModule=process.env.pm_entryModule,pm.sdk||(pm.sdk={});const{IPC:IPC}=require("./IPC"),initializeLogger=require("./Logger").init;global.pm.logger=console,global.pm.logger.getContext=function(e,o){return{api:e,domain:o}},initializeLogger({origin:`${pm.name}-node-process`,logPath:pm.logPath}),process.on("uncaughtException",(e=>{pm.logger.error(`Startup~[uncaught exception in Node Process]: ${e}`),e&&e.stack&&pm.logger.error(e.stack)})),process.on("unhandledRejection",(e=>{pm.logger.error(`Startup~[unhandled rejection in Node Process]: ${e}`),e&&e.stack&&pm.logger.error(e.stack)})),global.pm.sdk.ipc=new IPC(pm.name,pm.logger),pm.sdk.ipc.onReady((()=>{process.send({channel:"ready"})})),require(pm.entryModule);