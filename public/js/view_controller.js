
var ViewManager = new function(){

	var $content;
	var $list;
	var $clientTmpl;
	var $incomingView;
	var $diallingView;
	var $noClientsMex;
	var $callView;
	var $table;
	var $remoteVideo
	var $_overlayView;

	var self = this;

	this.Initialize = function(JoinRoomHandler){
		$content 		= $("#content");
		$joinScreen		= $content.find("#join");
		$list 			= $content.find("#client-list");
		$incomingView 	= $content.find("#call-incoming-view");
		$diallingView 	= $content.find("#call-dialling-view");
		$callView	 	= $content.find("#call-view");
		$remoteVideo	= $callView.find("#remoteVideo");
		$table 			= $list.find("tbody");
		$noClientsMex	= $list.find(".no-clients");
		$clientTmpl 	= $table.find(".client").clone();

		//for username validation
		SetupForm(JoinRoomHandler);

		//I'm not good at CSS
		$( window ).resize(SetVideoSize);
		SetVideoSize();

		//remove original client row, which is not valid HTML
		$table.find(".client").remove();
		$content.children().hide();
		$joinScreen.show();
		$content.show();
	}

	this.AddClient = function(client, onCall_cb){

		var name = client.name;
		var status = client.status;
		//client is not present
		if($list.find("#"+name).length == 0){
			var $newCli = $clientTmpl.clone();
			
			$newCli.attr("id",name)
			$newCli.find(".name").text(name);
			$newCli.find("button").click(function(){
				onCall_cb(name);
			});

			$newCli.appendTo($table);
			this.ChangeStatus(name, status);

			$noClientsMex.hide();
		}
	}

	this.RemoveClient = function(name){

		var $cli = $("#"+name, $list);
		$cli.remove();

		if($table.children().length == 0)
			$noClientsMex.show();
	}

	this.ChangeStatus = function(name, newStatus){
		
		var $status = $list.find("#"+name+" td.status");
		var $button = $list.find("#"+name+" button");

		if($status){
			var newClass;

			if(newStatus == "available"){
				newClass = "bg-success";
				$button.removeAttr('disabled');
			}
			else{
				$button.attr('disabled','disabled');
				
				if(newStatus == "busy")
					newClass = "bg-danger";
				else
					newClass = "bg-warning";
			}
			$status.removeClass().addClass("status "+newClass);
			$status.text(newStatus);
		}
	}

	this.Dial = function(name, onHang_cb){
		HideAndClearCb();

		$(".name", $diallingView).text(name);
		$("button.hang", $diallingView).click(onHang_cb);
		$diallingView.show();
		
		$_overlayView = $diallingView;
	}

	this.Incoming = function(name, onAnswer_cb, onHang_cb){
		HideAndClearCb();

		$(".name", $incomingView).text(name);
		$("button.answer", $incomingView).click(onAnswer_cb);
		$("button.hang", $incomingView).click(onHang_cb);
		$incomingView.show();

		$_overlayView = $incomingView;
	}

	this.AnswerCall = function(name, onHang_cb){
		HideAndClearCb();

		$(".name", $callView).text(name);
		$("button.hang", $callView).click(onHang_cb);
		$callView.show();

		$_overlayView = $callView;
	}

	this.Hang = function(){
		HideAndClearCb();
		$list.show();
	}

	function HideAndClearCb(){
		$content.children().hide();
		if($_overlayView){
			$("button", $_overlayView).off("click");
			$_overlayView = null;
		}
	}

	function SetupForm(JoinRoom){

		//add click listener to form submit
		$joinScreen.find("form").submit(function(e){
			e.preventDefault();
			var name = $joinScreen.find("input").val().trim();

    		var doesMatch = name.match(/^[a-zA-Z0-9_-]{3,16}$/);
			if(!doesMatch)
				ShowError(
					"The username must be alphanumeric from 3 to 16 letters",
					$joinScreen.find(".message")
				);
			else
				JoinRoom(name, OnJoinValid, OnJoinError);
		});
	}

	function OnJoinValid(){
		$joinScreen.hide();
		$list.show();
	}

	function OnJoinError(mex){
		ShowError(mex,$joinScreen.find(".message"));
	}

	function ShowError(mex, $el){
		$el.text(mex);
		$el.addClass("bg-danger");
	}

	function SetVideoSize(){
		var winH = $(window).height();
		$remoteVideo.css("max-height",winH-(winH*0.2));
	}
}
