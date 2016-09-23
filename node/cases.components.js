/*
 * Component for cases operations
 * All listeners of events (Socket an Service must init here)
 *
 * */
const File       = require(appPath.module('saveFile'));

module.exports = (App) => new Promise((resolve,reject)=>{

    const CaseMicroService = require(appPath.service('case'));
    const Socket = (require(appPath.module('clientSocket')))();

    function setup(){
        return new Promise((resolve)=>{

            Socket.client((client)=>{

                client.on('CASE:LIST',(params,callback)=>{
                    CaseMicroService.cases.get(params).then(
                        (data)=>{ callback(Socket.resolve(data)) },
                        (err) =>{ callback(Socket.reject(err))   }
                    )
                });

                client.on('CASE:CREATE',(params,callback)=>{
                    CaseMicroService.cases.post(params).then(
                        (data)=>{
                            callback(Socket.resolve(data));
                            client.broadcast.emit('CASE:NEW',data);
                        },
                        (err) =>{ callback(Socket.reject(err)) }
                    )
                });

                client.on('CASE:GET',(params,callback)=>{
                    CaseMicroService.cases.one(params).then(
                        (data)=>{callback(Socket.resolve(data))},
                        (err) =>{ callback(Socket.reject(err)) }
                    )
                });

                client.on('CASE:UPDATE',(params,callback)=>{
                    CaseMicroService.cases.put(params).then(
                        (data)=>{
                            callback(Socket.resolve(data));
                            client.broadcast.emit('CASE:UPDATED',data);
                        },
                        (err) =>{ callback(Socket.reject(err)) }
                    )
                });

                client.on('CASE:REMOVE',(params,callback)=>{
                    CaseMicroService.cases.remove(params).then(
                        (data)=>{
                            callback(Socket.resolve(data));
                            client.broadcast.emit('CASE:REMOVED',params);
                        },
                        (err) =>{ callback(Socket.reject(err)) }
                    )
                });

                client.on('SEARCH',(params,callback)=>{
                    CaseMicroService.cases.search(params).then(
                        (data)=>{callback(Socket.resolve(data))},
                        (err) =>{ callback(Socket.reject(err)) }
                    )
                });

                /* COLLABORATION */
                client.on('CASE:IS:EDIT',(info)=>{
                    client.broadcast.emit(Socket.caseEvent(info.id,'EDIT'),info.field);
                });

                client.on('CASE:IS:EDIT:DONE',(info)=>{
                    client.broadcast.emit(Socket.caseEvent(info.id,'EDIT:DONE'),info.field,info.value);
                });

                /* CASE WALL */
                client.on('CASE:WALL:CREATE',(params,callback)=>{
                    new Promise((resolve,reject)=>{
                        if(!params.Attachments || !Array.isArray(params.Attachments) || !params.Attachments.length) {
                            resolve([]);
                        } else {
                            const FOLDER = 'wall';
                            Promise.all(params.Attachments.map((attachment)=>{
                                let Att = new File(appPath.public(FOLDER));
                                Att.setContentType(attachment.type);
                                Att.setName();
                                return Att.saveBase64(attachment.base64)
                            })).then((files)=>{
                                resolve(files.map((f,i)=>{
                                    return {
                                        type:params.Attachments[i].type,
                                        name:params.Attachments[i].name,
                                        path:'/' + [FOLDER,f].join('/')
                                    }
                                }));
                            },reject)
                        }
                    }).then((Attachments)=>{
                        params.Attachments = Attachments;
                        CaseMicroService.wall.post(params).then(
                            (data)=>{ callback(Socket.resolve(data))},
                            (err) =>{ callback(Socket.reject(err))  }
                        )
                    });
                });

                client.on('CASE:WALL:LIST',(params,callback)=>{
                    CaseMicroService.wall.get(params).then(
                        (data)=>{callback(Socket.resolve(data))},
                        (err) =>{ callback(Socket.reject(err)) }
                    )
                });

                /* CASE WALL */
                client.on('CASE:ACTIONS:GET',(params,callback)=>{
                    CaseMicroService.actions.get(params).then(
                        (data)=>{callback(Socket.resolve(data))},
                        (err) =>{callback(Socket.reject(err))}
                    )
                });

                client.on('CASE:ACTIONS:CHANGE',(params,callback)=>{
                    CaseMicroService.actions.status(params).then(
                        (data)=>{callback(Socket.resolve(data))},
                        (err) =>{callback(Socket.reject(err))}
                    )
                });

            });

            CaseMicroService.on('NEW:CASE',(status,data)=>{
                Socket.connection.emit('CASE:NEW',data)
            });

            CaseMicroService.on('CASE:WALL:NEW',(status,data)=>{
                Socket.connection.emit(Socket.caseEvent(data.CaseId,'WALL:NEW'),data)
            });

            App.use('/api/tag', require(appPath.route('tag')));

            resolve(log.info('Component "CASES" inited'));
        })
    }

    CaseMicroService
        .ready()
        .then(setup)
        .then(resolve,reject);

});