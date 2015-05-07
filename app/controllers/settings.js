OS_IOS && $.logoutBtn.addEventListener("click", handleLogoutBtnClick);

$.profileImage.addEventListener("click", handleProfileImageClick);

$.getView().addEventListener("close", closeWindowEventHandler);

$.getView().addEventListener("androidback", androidBackEventHandler);

$.connectedToFriends = false;

$.onSwitchChangeActive = false;

$.twitterBtn.value = false;
$.facebookBtn.value = false;

$.refreshBtn.addEventListener("click", loadProfileInformation);

var pushLib = require('pushNotifications');



$.handleLogoutMenuClick = function(_event) {
  handleLogoutBtnClick(_event);
};

function handleLogoutBtnClick(_event) {

  require('pushNotifications').logout(function() {

    Alloy.Globals.currentUser.logout(function(_response) {
      if (_response.success) {
        Ti.API.debug('user logged out');

        require('sharing').deauthorize();

        $.parentController.userNotLoggedInAction();

      } else {
        Ti.API.error('error logging user out');
      }
    });
  });
};

function handleProfileImageClick() {
  var dopts = {
    options : ['Take Photo', 'Open Photo Gallery'],
    title : 'Pick Photo Source'
  };

  if (OS_IOS) {
    dopts.options.push('Cancel');
    dopts.cancel = dopts.options.length - 1;
  } else {
    dopts.buttonNames = ['Cancel'];
  }
  var optionDialog = Ti.UI.createOptionDialog(dopts);

  optionDialog.addEventListener('click', function(e) {
    var options = {
      success : processPhoto,
      cancel : function() {
      },
      error : function(e) {
        Ti.API.error(JSON.stringify(e));
      },
      allowEditing : true,
      mediaTypes : [Ti.Media.MEDIA_TYPE_PHOTO],
    };
    if (e.button) {
      return;
    } else if (e.index == 0) {
      Ti.Media.showCamera(options);
    } else if (e.index == 1) {
      Ti.Media.openPhotoGallery(options);
    }
  });

  optionDialog.show();
}

function processPhoto(_event) {

  Alloy.Globals.PW.showIndicator("Saving Image", false);
  var ImageFactory = require('ti.imagefactory');

  if (OS_ANDROID || _event.media.width > 700) {
    var w, h;
    w = _event.media.width * .50;
    h = _event.media.height * .50;
    $.currentUserCustomPhoto = ImageFactory.imageAsResized(_event.media, {
      width : w,
      height : h
    });
  } else {
    $.currentUserCustomPhoto = _event.media;
  }

  Alloy.Globals.currentUser.save({
    "photo" : $.currentUserCustomPhoto,
    "photo_sizes[thumb_100]" : "100x100#",
    "photo_sync_sizes[]" : "thumb_100",
  }, {
    success : function(_model, _response) {

      setTimeout(function() {

        Alloy.Globals.currentUser.showMe(function(_resp) {
          Alloy.Globals.PW.hideIndicator();

          _resp.model && (Alloy.Globals.currentUser = _resp.model);
          if (_resp.model.attributes.photo.processed) {
            $.profileImage.image = _resp.model.attributes.photo.urls.thumb_100;
            alert("Your profile photo has been changed.");
          } else {
            $.profileImage.image = _resp.model.attributes.photo.urls.original;

            alert("Your profile photo has been changed, thumbnail process not complete!");

            $.currentUserCustomPhoto = null;
            $.initialized = false;
          }
        });
      }, 3000);
    },
    error : function(error) {
      Alloy.Globals.PW.hideIndicator();
      alert("Error saving your profile " + String(error));
      Ti.API.error(error);
      return;
    }
  });
}

function loadProfileInformation() {

  Alloy.Globals.PW.showIndicator("Loading User Information", false);

  var attributes = Alloy.Globals.currentUser.attributes;
  var currentUser = Alloy.Globals.currentUser;

  pushLib.getChannels(currentUser, function(_response3) {
    var friendActive;
    if (_response3.success) {
      $.connectedToFriends = (_.contains(_response3.data.channel, "friends") !== -1);
      $.notificationsBtn.value = $.connectedToFriends;
    } else {
      $.notificationsBtn.value = $.connectedToFriends = false;
    }
  });

  if ($.currentUserCustomPhoto) {
    $.profileImage.image = $.currentUserCustomPhoto;
  } else if (attributes.photo && attributes.photo.urls) {
    $.profileImage.image = attributes.photo.urls.thumb_100 || attributes.photo.urls.original;
  } else if ( typeof (attributes.external_accounts) !== "undefined") {
    $.profileImage.image = 'https://graph.facebook.com/' + attributes.username + '/picture';
  } else {
    Ti.API.debug('no photo using missing gif');
    $.profileImage.image = '/missing.gif';
  }

  if (attributes.firstName && attributes.lastName) {
    $.fullname.text = attributes.firstName + " " + attributes.lastName;
  } else {
    $.fullname.text = attributes.username;
  }

  currentUser.showMe(function(_response) {
    if (_response.success) {
      $.photoCount.text = _response.model.get("stats").photos.total_count;
    } else {
      alert("Error getting user information");
    }

    currentUser.getFriends(function(_response2) {
      if (_response2.success) {
        $.friendCount.text = _response2.collection.length;
      } else {
        alert("Error getting user friend information");
      }

      Alloy.Globals.PW.hideIndicator();
    });
  });

  $.twitterBtn.value = Alloy.Globals.TW.isAuthorized();
  $.facebookBtn.value = Alloy.Globals.FB.getLoggedIn();

  $.onSwitchChangeActive = true;

  setTimeout(function() {
    Alloy.Globals.PW.hideIndicator();
  }, 200);

}

function closeWindowEventHandler(argument) {
}

function androidBackEventHandler(argument) {
}

function onSwitchChange(_event) {

  if ($.onSwitchChangeActive === false) {
    return;
  }

  $.onSwitchChangeActive = false;

  var selItem = _event.source;
  switch (selItem.id) {
    case "notificationsBtn" :
      if ($.connectedToFriends === true) {
        pushLib.pushUnsubscribe({
          channel : "friends",
          device_token : Alloy.Globals.pushToken
        }, function(_response) {
          if (_response.success) {
            selItem.value = $.connectedToFriends = false;
            activateOnSwitchChange();
          }
        });
      } else {
        pushLib.subscribe("friends", Alloy.Globals.pushToken, function(_response) {
          if (_response.success) {
            selItem.value = $.connectedToFriends = true;
            activateOnSwitchChange();
          }
        });
      }

      break;
    case "twitterBtn":
      if (Alloy.Globals.TW.isAuthorized() === false || selItem.value === false) {
        Alloy.Globals.TW.authorize(function(_response) {
          selItem.value = _response.userid ? true : false;
          activateOnSwitchChange();
        });
      } else {
        Alloy.Globals.TW.deauthorize();
        selItem.value = false;
        activateOnSwitchChange();
      }
      break;
    case "facebookBtn":
      if (Alloy.Globals.FB.getLoggedIn() === true ) {
        Alloy.Globals.FB.logout();
        selItem.value = false;
        activateOnSwitchChange();
      } else {
        require('sharing').prepForFacebookShare(function(_success) {
          selItem.value = _success;
          activateOnSwitchChange();
        });
      }
      break;
  }
}

function activateOnSwitchChange() {
  setTimeout(function() {
    $.onSwitchChangeActive = true;
  }, 200);
}


$.getView().addEventListener("focus", function() {
  setTimeout(function() {
    !$.initialized && loadProfileInformation();
    $.initialized = true;
  }, 200);
});