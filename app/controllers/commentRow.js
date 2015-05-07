var model = arguments[0] || {};
var user = model.attributes.user;

var moment = require('alloy/moment');

if (user.photo && user.photo.urls) {
	$.avatar.image = user.photo.urls.square_75 || user.photo.urls.thumb_100 || user.photo.urls.original;
}

$.comment.text = model.attributes.content;

$.userName.text = (user.first_name || "") + " " + (user.last_name || "");

$.userName.text = $.userName.text.trim().length !== 0 ? $.userName.text.trim() : user.username;
$.date.text = moment(model.attributes.created_at).fromNow();

$.row.comment_id = model.id || '';