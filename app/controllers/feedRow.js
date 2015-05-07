var model = arguments[0] || {};

$.image.image = model.attributes.urls.preview;
$.titleLabel.text = model.attributes.title || '';

debugger;
$.row.row_id = model.id || '';