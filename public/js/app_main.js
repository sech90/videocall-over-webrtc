
SocketManager.On("error-mex", function(mex){console.error("Server returned an error: "+mex)});
SocketManager.On("joined", OnJoinRoom);
SocketManager.On("client-connected", OnNewRemoteClient);
SocketManager.On("client-disconnected", OnRemoteCLientDisconnect);
SocketManager.On("client-status", OnRemoteStatusChange);
SocketManager.On("remote-incoming", OnRemoteIncoming);
SocketManager.On("remote-answer", OnRemoteAnswer);
SocketManager.On("remote-hang", OnRemoteHang);
SocketManager.On("local-dialling", OnLocalDialling);
SocketManager.On("local-answer", OnLocalAnswer);
SocketManager.On("local-hang", OnLocalHang);
SocketManager.On("message", CallManager.HandleMessage);

ViewManager.Initialize(SocketManager.Join);

function OnJoinRoom(allClients){
	CallManager.Initialize();
	for(var i=0; i<allClients.length; i++)
		ViewManager.AddClient(allClients[i], SocketManager.Dial);
}

function OnNewRemoteClient(client){
	ViewManager.AddClient(client, SocketManager.Dial);
}

function OnRemoteCLientDisconnect(name){
	ViewManager.RemoveClient(name);
}

function OnRemoteStatusChange(data){
	ViewManager.ChangeStatus(data.name, data.status);
}

function OnRemoteIncoming(name){
	ViewManager.Incoming(
		name,
		SocketManager.Answer,
		SocketManager.Hang
	);
}

function OnRemoteHang(){
	CallManager.Hang();
	ViewManager.Hang();
}

function OnRemoteAnswer(name){
	ViewManager.AnswerCall(name, SocketManager.Hang);
	CallManager.StartCall(true);
}

function OnLocalDialling(name){
	ViewManager.Dial(name, SocketManager.Hang);
}

function OnLocalAnswer(name){
	ViewManager.AnswerCall(name, SocketManager.Hang);
	CallManager.StartCall(false);
}
function OnLocalHang(){
	CallManager.Hang();
	ViewManager.Hang();
}

$( window ).unload(function() {
  CallManager.Hang();
  CallManager.CloseStream();
  SocketManager.Leave();
});