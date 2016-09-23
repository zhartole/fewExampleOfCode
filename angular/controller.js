/**
 * @module Wall controller
 * @description Contain methods to work with.
 * Inject needed parts and services/components/directives.
 * */

import casesManager from '../../services/casesManager'
import $fileUploader from '../../../../components/fileUploader';
import User from '../../../../services/user';
import '../../../../directives/infiniteScroll';
import $socket from '../../../../services/socket';
import $popup from '../../../../components/popup';
import $debounce from '../../../../services/debounce';


export default function controller($filter,$debounce, $popup, $state, $socket, $scope, $timeout, casesManager,$fileUploader,User) {
    return new class wallCtrl {
        constructor() {
            this.list = [];
            this.added = [];
            this.inputText = null;
            this.scrollDown = this.loadOlder.bind(this);
            this.getList($state.params.id);
            this.setCollaboration();
            this.uploadFile();
            this.debGetList = $debounce(this.getList,1000);
        }
        uploadFile(){
            this.fileUploader = new $fileUploader();
            this.fileUploader.on('change',(file)=>{
                this.fileUploader.toBase64(file).then((base64)=>{
                    this.added.push({base64:base64, type:file.type, name:file.name});
                });
            });
        }

        getList(caseId, limit){
            caseId = caseId || $state.params.id;
            let msgTime = this.list && this.list.length ? this.list[0].CreatedDate : null;
            // console.log('getWallMsgs',[caseId, limit || 10, msgTime]);
            casesManager.getWallMsgs(caseId, limit || 10, msgTime).then((response)=>{
                // console.log('wall', response.data);
                if(response && response.status){
                    if(limit){
                        this.list.unshift(...response.data);
                        this.list = $filter('orderBy')(this.list, 'CreatedDate');
                        response.data.length ? this.scrollBottom(null,25) : null;
                    }else{
                        this.list =  response.data.length ? $filter('orderBy')(response.data, 'CreatedDate') : [];
                    }
                }
            });
        }

        setCollaboration(){
            this.disabledFields = {};
            let namespace = `CASE::${$state.params.id}`;
            let listeners = [];
            listeners.push($socket.on(namespace + ':WALL:NEW',(response)=>{
                if(response){
                    this.list.push(response);
                }
            }));
            $scope.$on('$destroy',()=>listeners.forEach((item)=>item()))
        }

        loadOlder(){
            if (!$scope.isLoading) {
                $scope.isLoading = true;
                this.debGetList(null, 3);
                $scope.isLoading = false;
            }
        };

        addMsg() {
            var msg = {
                CaseId:$state.params.id,
                Text:null,
                User:User.info._id,
                Attachments:[]
            };
            if(this.inputText && this.inputText.length){
                msg.Text = this.inputText;
                this.inputText = null;
            }
            if(this.added && this.added.length){
                msg.Attachments = this.added;
                this.added = [];
            }
            casesManager.addWallMsg(msg).then((response)=>{
                if(response){
                    $popup.success('G:SUCCESS','G:ADDED',{translateItem:'case.opened.wall.msg.one'});
                }else{
                    $popup.danger('G:ERROR','G:NOT:ADDED',{translateItem:'case.opened.wall.msg.one'});
                }
            });
        };

        isEnterPressed(event){
            if(event.ctrlKey && event.keyCode === 10){
                this.addMsg();
            }
        };

        deleteAdded(index){
            this.added.splice(index,1)
        };

    }
}

controller.$as = 'wall';
controller.$inject = ['$filter',$debounce, $popup,'$state', $socket, '$scope', '$timeout', casesManager,$fileUploader,User];

