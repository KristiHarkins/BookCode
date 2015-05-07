function doOpen() {

  if (OS_ANDROID) {
    var activity = $.getView().activity;
    var menuItem = null;

    activity.onCreateOptionsMenu = function(e) {

      Ti.API.info('IN activity.onCreateOptionsMenu');
      Ti.API.info('Active Tab: ' + $.tabGroup.activeTab.title);
      if ($.tabGroup.activeTab.title === "Settings") {
        menuItem = e.menu.add({
          title : "Logout",
          showAsAction : Ti.Android.SHOW_AS_ACTION_ALWAYS,
        });
        menuItem.addEventListener("click", function(e) {
          $.settingsController.handleLogoutMenuClick();
        });
      } else if ($.tabGroup.activeTab.title === "Feed") {

        menuItem = e.menu.add({
          title : "Take Photo",
          showAsAction : Ti.Android.SHOW_AS_ACTION_ALWAYS,
          icon : Ti.Android.R.drawable.ic_menu_camera
        });

        menuItem.addEventListener("click", function(e) {
          $.feedController.cameraButtonClicked();
        });
      }
    };

    activity.invalidateOptionsMenu();

    $.tabGroup.addEventListener('blur', function(_event) {
      $.getView().activity.invalidateOptionsMenu();
    });
  }
}

function initializePushNotifications(_user) {

  Alloy.Globals.pushToken = null;
  var pushLib = require('pushNotifications');

  pushLib.initialize(_user,
  function(_pushData) {
    Ti.API.info('I GOT A PUSH NOTIFICATION');
    var payload;

    try {
      if (_pushData.payload) {
        payload = JSON.parse(_pushData.payload);
      } else {
        payload = _pushData;
      }
    } catch(e) {
      payload = {};
    }

    if (OS_ANDROID) {
      Ti.UI.createAlertDialog({
        title : payload.android.title || "Alert",
        message : payload.android.alert || "",
        buttonNames : ['Ok']
      }).show();
    } else {
      Ti.UI.createAlertDialog({
        title : "Alert",
        message : payload.alert || "",
        buttonNames : ['Ok']
      }).show();
    }

  },
  function(_pushInitData) {
    if (_pushInitData.success) {
      Alloy.Globals.pushToken = _pushInitData.data.deviceToken;

      Ti.API.debug("Success: Initializing Push Notifications " + JSON.stringify(_pushInitData));
    } else {
      alert("Error Initializing Push Notifications");
      Alloy.Globals.pushToken = null;
    }
  });
}

/**
 *
 */
$.loginSuccessAction = function(_options) {

  initializePushNotifications(_options.model);

  Ti.API.info('logged in user information');
  Ti.API.info(JSON.stringify(_options.model, null, 2));

  $.tabGroup.open();

  $.tabGroup.setActiveTab(0);

  $.feedController.initialize();

  Alloy.Globals.currentUser = _options.model;

  $.feedController.parentController = $;
  $.friendsController.parentController = $;
  $.settingsController.parentController = $;

  $.loginController && $.loginController.close();
};

$.userNotLoggedInAction = function() {
  debugger;
  if (!$.loginController) {
    var loginController = Alloy.createController("login", {
      parentController : $,
      reset : true
    });

    $.loginController = loginController;
  }

  $.loginController.open(true);

};

$.userLoggedInAction = function() {
  user.showMe(function(_response) {
    if (_response.success === true) {
      $.loginSuccessAction(_response);
    } else {
      alert("Application Error\n " + _response.error.message);
      Ti.API.error(JSON.stringify(_response.error, null, 2));

      $.userNotLoggedInAction();
    }
  });
};

var user = Alloy.createModel('User');

if (user.authenticated() === true) {
  $.userLoggedInAction();
} else {
  $.userNotLoggedInAction();
}

Alloy.Globals.openCurrentTabWindow = function(_window) {
  $.tabGroup.activeTab.open(_window);
};
