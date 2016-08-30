function Line (color, lineWidth) {
  this.points = [];
  this.prevPoint = null;
  this.lineWidth = lineWidth;
  this.lineWidthModifier = 0.0;
  this.color = color.clone();
  var textureLoader = new THREE.TextureLoader();

  this.texture = textureLoader.load('stroke1.png', function (texture) {
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
  });

  var material = new THREE.MeshStandardMaterial({
  //var material = new THREE.MeshBasicMaterial({
    color: this.color,
    roughness: 0.5,
    metalness: 0.5,
    side: THREE.DoubleSide,
    //shading: THREE.FlatShading
    /*
    map: this.texture,
    transparent: true,
    alphaTest: 0.5
    */
  });
  this.idx = 0;
  this.numPoints = 0;
  this.maxPoints = 1000;
  this.geometry = new THREE.BufferGeometry();
  this.vertices = new Float32Array(this.maxPoints * 3 * 3);
  this.normals = new Float32Array(this.maxPoints * 3 * 3);
  this.uvs = new Float32Array(this.maxPoints * 2 * 2);

  this.geometry.setDrawRange(0, 0);
  this.geometry.addAttribute('position', new THREE.BufferAttribute(this.vertices, 3).setDynamic(true));
  this.geometry.addAttribute('uv', new THREE.BufferAttribute(this.uvs, 2).setDynamic(true));
  this.geometry.addAttribute('normal', new THREE.BufferAttribute(this.normals, 3).setDynamic(true));

  this.mesh = new THREE.Mesh(this.geometry, material);
  this.mesh.drawMode = THREE.TriangleStripDrawMode;

  this.mesh.frustumCulled = false;
  this.mesh.vertices = this.vertices;
}

Line.prototype = {
  getBinary: function () {
    var color = this.color;
    var points = this.points;
    // Point = vector3(3) + quat(4) + intensity(1)
    // Color = 3*4 = 12
    // NumPoints = 4
    var bufferSize = 16 + ((1+3+4) * 4 * points.length);
    var binaryWriter = new BinaryWriter(bufferSize);
    //console.log(color, points.length);
    binaryWriter.writeColor(color);
    binaryWriter.writeUint32(points.length);

    for (var i = 0; i < points.length; i++) {
      var point = points[i];
      binaryWriter.writeArray(point.position.toArray());
      binaryWriter.writeArray(point.rotation.toArray());
      binaryWriter.writeFloat(point.intensity);
    }
    return binaryWriter.getDataView();
  },
  getJSON: function () {
    return {
      stroke: {color: this.color},
      points: this.points
    };
  },
  addPoint: function (position, rotation, intensity) {
    if (this.prevPoint && this.prevPoint.equals(position)) {
      return;
    }
    this.prevPoint = position.clone();

    var uv = 0;
    for (i = 0; i < this.numPoints; i++) {
      this.uvs[ uv++ ] = i / (this.numPoints - 1);
      this.uvs[ uv++ ] = 0;

      this.uvs[ uv++ ] = i / (this.numPoints - 1);
      this.uvs[ uv++ ] = 1;
    }

    var direction = new THREE.Vector3();
    direction.set(0, 1.7, 1);
    direction.applyQuaternion(rotation);
    direction.normalize();
    var posBase = position.clone().add(direction.clone().multiplyScalar(-0.08));

    direction = new THREE.Vector3();
    direction.set(1, 0, 0);
    direction.applyQuaternion(rotation);
    direction.normalize();

    var posA = posBase.clone();
    var posB = posBase.clone();
    var lineWidth = this.lineWidth * intensity;
    posA.add(direction.clone().multiplyScalar(lineWidth));
    posB.add(direction.clone().multiplyScalar(-lineWidth));

    this.vertices[ this.idx++ ] = posA.x;
    this.vertices[ this.idx++ ] = posA.y;
    this.vertices[ this.idx++ ] = posA.z;

    this.vertices[ this.idx++ ] = posB.x;
    this.vertices[ this.idx++ ] = posB.y;
    this.vertices[ this.idx++ ] = posB.z;

    this.computeVertexNormals();
    this.geometry.attributes.normal.needsUpdate = true;
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.uv.needsUpdate = true;
    // this.geometry.computeVertexNormals();

    this.numPoints++;
    // 2 -> 4
    // 3 -> 6
    // 4 -> 8
    this.geometry.setDrawRange(0, this.numPoints * 2);

    this.points.push({
      'position': position,
      'rotation': rotation,
      'intensity': intensity
    });
  },
  computeVertexNormals: function () {
    var vA, vB, vC,

    pA = new THREE.Vector3(),
    pB = new THREE.Vector3(),
    pC = new THREE.Vector3(),

    cb = new THREE.Vector3(),
    ab = new THREE.Vector3();

    for (var i = 0, il = this.idx; i < il; i ++) {
      this.normals[ i ] = 0;
    }

    var n = 0;
    var pair = true;
    for (var i = 0, il = this.idx; i < il; i += 3) {
      if (pair) {
        pA.fromArray(this.vertices, i);
        pB.fromArray(this.vertices, i + 3);
        pC.fromArray(this.vertices, i + 6);
      } else {
        pA.fromArray(this.vertices, i + 3);
        pB.fromArray(this.vertices, i);
        pC.fromArray(this.vertices, i + 6);
      }
      pair = !pair;

      cb.subVectors(pC, pB);
      ab.subVectors(pA, pB);
      cb.cross(ab);
      cb.normalize();

      this.normals[ i ] += cb.x;
      this.normals[ i + 1 ] += cb.y;
      this.normals[ i + 2 ] += cb.z;

      this.normals[ i + 3 ] += cb.x;
      this.normals[ i + 4 ] += cb.y;
      this.normals[ i + 5 ] += cb.z;

      this.normals[ i + 6 ] += cb.x;
      this.normals[ i + 7 ] += cb.y;
      this.normals[ i + 8 ] += cb.z;
    }

    for (var i = 2 * 3, il = this.idx - 2 * 3; i < il; i ++) {
      this.normals[ i ] = this.normals[ i ] / 3;
    }

    this.normals[ 3 ] = this.normals[ 3 ] / 2;
    this.normals[ 3 + 1 ] = this.normals[ 3 + 1 ] / 2;
    this.normals[ 3 + 2 ] = this.normals[ 3 * 1 + 2 ] / 2;

    this.normals[ this.idx - 2 * 3] = this.normals[  this.idx - 2 * 3 ] / 2;
    this.normals[ this.idx - 2 * 3 + 1 ] = this.normals[  this.idx - 2 * 3 + 1] / 2;
    this.normals[ this.idx - 2 * 3 + 2] = this.normals[  this.idx - 2 * 3 + 2] / 2;

    console.log(this.idx - 2 * 3, this.idx - 2 * 3+1,this.idx - 2 * 3+2, this.idx);
    this.geometry.normalizeNormals();
  }
};
