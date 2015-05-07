exports.definition = {

  config : {

    "adapter" : {
      "type" : "acs",
      "collection_name" : "photos"
    }
  },

  extendModel : function(Model) {
    _.extend(Model.prototype, {

      // extended functions go here

    });

    return Model;
  },

  extendCollection : function(Collection) {
    _.extend(Collection.prototype, {

      findMyPhotosAndWhoIFollow : function(_user, _options) {
        var collection = this;

        _user.getFriends(function(_resp) {
          if (_resp.success) {

            var idList = _.pluck(_resp.collection.models, "id");
            idList.push(_user.id);

            var where_params = {
              "user_id" : {
                "$in" : idList
              },
              title : {
                "$exists" : true
              }
            };
            _options.data = _options.data || {};
            _options.data.order = '-created_at';
            _options.data.per_page = 25;
            _options.data.where = JSON.stringify(where_params);

            collection.fetch(_options);
          } else {
            Ti.API.error('Error fetching friends');
            _options.error();
          }
        });
      },
      findPhotosNearMe : function(_user, _location, _distance, _options) {
        var collection = this;

        var distance = _distance ? (_distance / 3959) : 0.00126;

        if (_location === null) {
          _options.error("Could Not Find Photos");
          return;
        }
        _user.getFriends(function(_resp) {
          if (_resp.success) { debugger;

            var idList = _.pluck(_resp.collection.models, "id");
            idList.push(_user.id);

            var coords = [];
            coords.push(_location.coords.longitude);
            coords.push(_location.coords.latitude);

            var where_params = {
              "user_id" : {
                "$in" : idList
              },
              "coordinates" : {
                "$nearSphere" : coords,
                "$maxDistance" : distance 
              }
            };
            _options.data = _options.data || {};
            _options.data.per_page = 25;
            _options.data.where = JSON.stringify(where_params);

            collection.fetch(_options);
          } else {
            _options.error("Could Not Find Photos");
            return;
          }
        });
      }
    });

    return Collection;
  },
};