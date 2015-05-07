var geo = require("geo");

var sharing = require("sharing");

var push = require('pushNotifications');

var args = arguments[0] || {};

OS_IOS && $.cameraButton.addEventListener("click", function(_event) {
  $.cameraButtonClicked(_event);
});

$.feedTable.addEventListener("click", processTableClicks);

$.filter.addEventListener( OS_IOS ? 'click' : 'change', filterTabbedBarClicked);

$.mapview.addEventListener('click', mapAnnotationClicked);


function processTableClicks(_event) {
  if (_event.source.id === "commentButton") {
    handleCommentButtonClicked(_event);
  } else if (_event.source.id === "locationButton") {
    handleLocationButtonClicked(_event);
  } else if (_event.source.id === "shareButton") {
    handleShareButtonClicked(_event);
  }
}

/**
 *
 */
function filterTabbedBarClicked(_event) {
  var itemSelected = OS_IOS ? _event.index : _event.rowIndex;
  switch (itemSelected) {
    case 0 :
      $.mapview.visible = false;
      $.feedTable.visible = true;
      break;
    case 1 :
      $.feedTable.visible = false;
      $.mapview.visible = true;
      showLocalImages();
      break;
  }
}

function handleShareButtonClicked(_event) {
  var collection, model;

  if (!_event.row) {
    model = _event.data;
  } else {
    collection = Alloy.Collections.instance("Photo");
    model = collection.get(_event.row.row_id);
  }

  sharing.sharingOptions({
    model : model
  });
}

function handleLocationButtonClicked(_event) {

  var collection = Alloy.Collections.instance("Photo");
  var model = collection.get(_event.row.row_id);
  debugger;

  var customFields = model.get("custom_fields");

  if (customFields && customFields.coordinates) {
    var mapController = Alloy.createController("mapView", {
      photo : model,
      parentController : $
    });

    Alloy.Globals.openCurrentTabWindow(mapController.getView());
  } else {
    alert("No Location was Saved with Photo");
  }
}

function handleCommentButtonClicked(_event) {
  var collection, model = null;

  if (!_event.row) {
    model = _event.data;
  } else {
    collection = Alloy.Collections.instance("Photo");
    model = collection.get(_event.row.row_id);
  }

  var controller = Alloy.createController("comment", {
    photo : model,
    parentController : $
  });

  controller.initialize();

  Alloy.Globals.openCurrentTabWindow(controller.getView());

}

$.cameraButtonClicked = function(_event) {
  var photoSource;

  Ti.API.debug('Ti.Media.isCameraSupported ' + Ti.Media.isCameraSupported);

  if (!Ti.Media.isCameraSupported) {
    photoSource = 'openPhotoGallery';
  } else {
    photoSource = 'showCamera';
  }

  Titanium.Media[photoSource]({
    success : function(event) {

      Alloy.Globals.PW.showIndicator("Saving Image", false);
      var ImageFactory = require('ti.imagefactory');

      if (OS_ANDROID || event.media.width > 700) {
        var w, h;
        w = event.media.width * .50;
        h = event.media.height * .50;
        $.resizedPhoto = ImageFactory.imageAsResized(event.media, {
          width : w,
          height : h
        });
      } else {
        $.resizedPhoto = event.media;
      }

      processImage($.resizedPhoto, function(_photoResp) {

        Alloy.Globals.PW.hideIndicator();

        if (_photoResp.success) {

          var row = Alloy.createController("feedRow", _photoResp.model);

          if ($.feedTable.getData().length === 0) {
            $.feedTable.setData([]);
            $.feedTable.appendRow(row.getView(), true);
          } else {
            $.feedTable.insertRowBefore(0, row.getView(), true);
          }

          var collection = Alloy.Collections.instance("Photo");
          collection.add(_photoResp.model, {
            at : 0,
            silent : true
          });

          notifyFollowers(_photoResp.model, "New Photo Added");

        } else {
          alert("Error saving photo " + processResponse.message);
        }

      });
    },
    cancel : function() {
    },
    error : function(error) {
      if (error.code == Titanium.Media.NO_CAMERA) {
        alert('Please run this test on device');
      } else {
        alert('Unexpected error: ' + error.code);
      }
    },
    saveToPhotoGallery : false,
    allowEditing : true,
    mediaTypes : [Ti.Media.MEDIA_TYPE_PHOTO]
  });

};

function processImage(_mediaObject, _callback) {

  geo.getCurrentLocation(function(_coords) {
    var parameters = {
      "photo" : _mediaObject,
      "title" : "Sample Photo " + new Date(),
      "photo_sizes[preview]" : "200x200#",
      "photo_sizes[iphone]" : "320x320#",
      "photo_sync_sizes[]" : "preview"
    };

    if (_coords) {
      parameters.custom_fields = {
        coordinates : [_coords.coords.longitude, _coords.coords.latitude],
        location_string : _coords.title
      };
    }

    var photo = Alloy.createModel('Photo', parameters);

    photo.save({}, {
      success : function(_model, _response) {
        Ti.API.debug('success: ' + _model.toJSON());
        _callback({
          model : _model,
          message : null,
          success : true
        });
      },
      error : function(e) {
        Ti.API.error('error: ' + e.message);
        _callback({
          model : parameters,
          message : e.message,
          success : false
        });
      }
    });
  });
}

function loadPhotos() {
  var rows = [];

  var photos = Alloy.Collections.photo || Alloy.Collections.instance("Photo");

  var where = {
    title : {
      "$exists" : true
    }
  };

  photos.fetch({
    data : {
      order : '-created_at',
      where : where
    },
    success : function(model, response) {
      photos.each(function(photo) {
        var photoRow = Alloy.createController("feedRow", photo);
        rows.push(photoRow.getView());
      });
      $.feedTable.data = rows;
    },
    error : function(error) {
      alert('Error loading Feed ' + error.message);
      Ti.API.error(JSON.stringify(error));
    }
  });
}


function showLocalImages() {
  $.locationCollection = Alloy.createCollection('photo');

  geo.getCurrentLocation(function(_coords) {
    var user = Alloy.Globals.currentUser;

    $.locationCollection.findPhotosNearMe(user, _coords, 5, {
      success : function(_collection, _response) {
        Ti.API.debug('findPhotosNearMe ' + JSON.stringify(_collection));

        if (_collection.models.length) {
          addPhotosToMap(_collection);
        } else {
          alert("No Local Images Found");
          filterTabbedBarClicked({
            index : 0,
            rowIndex : 0,
          });

          if (OS_ANDROID) {
            $.filter.setSelectedRow(0, 0, false);
          } else {
            $.filter.setIndex(0);
          }
        }
      },
      error : function(error) {
        alert('Error loading Feed ' + error.message);
        Ti.API.error(JSON.stringify(error));
      }
    });
  });
}

function addPhotosToMap(_collection) {
  var annotationArray = [];
  var lastLat;

  $.mapview.removeAllAnnotations();

  var annotationRightButton = function() {
    var button = Ti.UI.createButton({
      title : "X",
    });
    return button;
  };

  for (var i in _collection.models) {
    var mapData = _collection.models[i].toJSON();
    var coords = mapData.custom_fields.coordinates;
    var annotation = Alloy.Globals.Map.createAnnotation({
      latitude : Number(coords[0][1]),
      longitude : Number(coords[0][0]),
      subtitle : mapData.custom_fields.location_string,
      title : mapData.title,
      data : _collection.models[i].clone()
    });

    if (OS_IOS) {
      annotation.setPincolor(Alloy.Globals.Map.ANNOTATION_RED);
      annotation.setRightButton(Titanium.UI.iPhone.SystemButton.DISCLOSURE);
    } else {
      annotation.setRightView(annotationRightButton);
    }
    annotationArray.push(annotation);

  }

  var region = geo.calculateMapRegion(annotationArray);
  $.mapview.setRegion(region);

  $.mapview.setAnnotations(annotationArray);
}

function mapAnnotationClicked(_event) {
  var annotation = _event.annotation;
  var clickSource = _event.clicksource;

  var showDetails = false;

  if (OS_IOS) {
    showDetails = (clickSource === 'rightButton');
  } else {
    showDetails = (clickSource === 'subtitle' || clickSource === 'title');
  }

  if (showDetails) {

    var mapDetailCtrl = Alloy.createController('mapDetail', {
      photo : annotation.data,
      parentController : $,
      clickHandler : processTableClicks
    });

    Alloy.Globals.openCurrentTabWindow(mapDetailCtrl.getView());

  } else {
    Ti.API.info('clickSource ' + clickSource);
  }
};

function notifyFollowers(_model, _message) {

  var currentUser = Alloy.Globals.currentUser;

  currentUser.getFollowers(function(_resp) {
    if (_resp.success) {
      $.followersList = _.pluck(_resp.collection.models, "id");

      if ($.followersList.length) {

        var msg = _message + " " + currentUser.get("email");

        push.sendPush({
          payload : {
            custom : {
              photo_id : _model.get("id"),
            },
            sound : "default",
            alert : msg
          },
          to_ids : $.followersList.join(),
        }, function(_repsonsePush) {
          if (_repsonsePush.success) {
            alert("Notified friends of new photo");
          } else {
            alert("Error notifying friends of new photo");
          }
        });
      }
    } else {
      alert("Error updating friends and followers");
    }
  });

}

$.initialize = function() {
  loadPhotos();
};