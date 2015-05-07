var args = arguments[0] || {};
$.parentController = args.parentController;

$.showLoginBtn.addEventListener('click', showLoginBtnClicked);
$.showCreateAccountBtn.addEventListener('click', showCreateAccountBtnClicked);
$.cancelCreateAcctBtn.addEventListener('click', cancelActionButtonClicked);
$.cancelLoginBtn.addEventListener('click', cancelActionButtonClicked);

$.doLoginBtn.addEventListener('click', doLoginBtnClicked);
$.doCreateAcctBtn.addEventListener('click', doCreateAcctBtnClicked);

$.showLoginFBBtn.addEventListener('click', doFacebookLoginAction);

function showLoginBtnClicked() {
  $.createAcctView.hide();
  $.homeView.hide();
  $.loginView.show();
};

function showCreateAccountBtnClicked() {
  $.createAcctView.show();
  $.homeView.hide();
  $.loginView.hide();
};

function cancelActionButtonClicked() {
  $.createAcctView.hide();
  $.loginView.hide();

  Alloy.Globals.loggedIn = false;

  $.homeView.show();
}

function userActionResponseHandler(_resp) {
  if (_resp.success === true) {

    Alloy.Globals.loggedIn = true;
    Alloy.Globals.CURRENT_USER = _resp.model;

    $.parentController.loginSuccessAction(_resp);

  } else {
    alert("loginFailed", _resp.error.message);

    Alloy.Globals.CURRENT_USER = null;
    Alloy.Globals.loggedIn = false;
  }
};

function faceBookLoginEventHandler(_event) {

  Alloy.Globals.FB.removeEventListener('login', faceBookLoginEventHandler);

  if (_event.success) {
    doFacebookLoginAction(_event.data);
  } else if (_event.error) {
    alert(_event.error);
  } else {
    _event.cancelled && alert("User Canceled");
  }
};

function faceBookLoginErrorHandler(_user, _error) {
  alert("Error: " + _error.code + " " + _error.message);

  Alloy.Globals.loggedIn = false;
  Alloy.Globals.CURRENT_USER = null;
};

function doFacebookLoginAction(_options) {
  var FB = Alloy.Globals.FB;

  if (FB.loggedIn === false) {

    debugger;

    FB.forceDialogAuth = false;

    FB.appid = Ti.App.Properties.getString("ti.facebook.appid");

    FB.addEventListener("login", faceBookLoginEventHandler);

    FB.authorize();

  } else {
    debugger;
    var user = Alloy.createModel('User');
    user.updateFacebookLoginStatus(FB.accessToken, {
      success : function(_resp) {

        Ti.App.Properties.setString("loginType", "FACEBOOK");

        Alloy.Globals.loggedIn = true;
        Alloy.Globals.CURRENT_USER = _resp.model;

        if (_options.email !== undefined) {
          _resp.model.save({
            "email" : _options.email,
            "username" : _options.username
          }, {
            success : function(_user, _response) {
              $.parentController.loginSuccessAction(_resp);

              Alloy.Globals.CURRENT_USER = _user;
            },
            error : faceBookLoginErrorHandler
          });
        } else {
          $.parentController.loginSuccessAction(_resp);
        }
      },
      error : faceBookLoginErrorHandler
    });
  }
}

function doLoginBtnClicked() {

  var user = Alloy.createModel('User');

  user.login($.email.value, $.password.value, userActionResponseHandler);
};

function doCreateAcctBtnClicked() {
  if ($.acct_password.value !== $.acct_password_confirmation.value) {
    alert("Please re-enter information");
    return;
  }

  var params = {
    first_name : $.acct_fname.value,
    last_name : $.acct_lname.value,
    username : $.acct_email.value,
    email : $.acct_email.value,
    password : $.acct_password.value,
    password_confirmation : $.acct_password_confirmation.value,
  };

  var user = Alloy.createModel('User');

  user.createAccount(params, userActionResponseHandler);
};

$.open = function(_reset) {
  _reset && cancelActionButtonClicked();
  $.index.open();
};
$.close = function() {
  debugger;
  $.index.close();
};