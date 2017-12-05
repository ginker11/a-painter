const AtlasJSON = require('../brushes/brush_atlas.json');

function Atlas () {
  this.map = new THREE.TextureLoader().load(AtlasJSON.meta.image);
}

Atlas.prototype = {
  getUVConverters (filename) {
    if (filename) {
      filename = filename.replace('brushes/', '');
      return {
        convertU(u) {
          var totalSize = AtlasJSON.meta.size;
          var data = AtlasJSON.frames[filename];
          if (u>1 || u<0) {
            console.log(filename, u);
          }
          return data.frame.x / totalSize.w + u * data.frame.w / totalSize.w;
        },

        convertV(v) {
          var totalSize = AtlasJSON.meta.size;
          var data = AtlasJSON.frames[filename];

          return 1- (data.frame.y / totalSize.h + v * data.frame.h / totalSize.h);
        }
      }
    } else {
      return {
        convertU(u) { return u; },
        convertV(v) { return v; }
      }      
    }
  }
};

window.atlas = new Atlas();
