var parameters = arguments[0] || {};
var currentPhoto = parameters.photo || {};
var parentController = parameters.parentController || {};
var callbackFunction = parameters.callback || null;

OS_IOS && $.saveButton.addEventListener("click", handleButtonClicked);
OS_IOS && $.cancelButton.addEventListener("click", handleButtonClicked);

function handleButtonClicked(_event) {

	var returnParams = {
		success : false,
		content : null
	};

	if (_event.source.id === "saveButton") {
		returnParams = {
			success : true,
			content : $.commentContent.value
		};
	}

	callbackFunction && callbackFunction(returnParams);

}

function doOpen() {

	if (OS_ANDROID) {

		$.getView().activity.onCreateOptionsMenu = function(_event) {

			var activity = $.getView().activity;
			var actionBar = $.getView().activity.actionBar;

			if (actionBar) {
				actionBar.displayHomeAsUp = true;
				actionBar.onHomeIconItemSelected = function() {
					$.getView().close();
				};
			} else {
				alert("No Action Bar Found");
			}

			var mItemSave = _event.menu.add({
				id : "saveButton",
				title : "Save Comment",
				showAsAction : Ti.Android.SHOW_AS_ACTION_ALWAYS,
				icon : Ti.Android.R.drawable.ic_menu_save
			});

			mItemSave.addEventListener("click", function(_event) {
				_event.source.id = "saveButton";
				handleButtonClicked(_event);
			});

			var mItemCancel = _event.menu.add({
				id : "cancelButton",
				title : "Cancel",
				showAsAction : Ti.Android.SHOW_AS_ACTION_ALWAYS,
				icon : Ti.Android.R.drawable.ic_menu_close_clear_cancel
			});

			mItemCancel.addEventListener("click", function(_event) {
				_event.source.id = "cancelButton";
				handleButtonClicked(_event);
			});
		};
	}

	setTimeout(function() {
		$.commentContent.focus();
	}, 400);

};