/**
 * @author donovan6000 / http://exploitkings.com
 * @author mrdoob / http://mrdoob.com/
 */


THREE.M3DLoader = function () {};

THREE.M3DLoader.prototype = {

	constructor: THREE.M3DLoader

};

THREE.M3DLoader.prototype.load = function ( url, callback ) {

	var scope = this;

	var xhr = new XMLHttpRequest();

	function onloaded( event ) {

		if ( event.target.status === 200 || event.target.status === 0 ) {

			var geometry = scope.parse( event.target.response || event.target.responseText );

			scope.dispatchEvent( { type: 'load', content: geometry } );

			if ( callback ) callback( geometry );

		} else {

			scope.dispatchEvent( { type: 'error', message: 'Couldn\'t load URL [' + url + ']', response: event.target.statusText } );

		}

	}

	xhr.addEventListener( 'load', onloaded, false );

	xhr.addEventListener( 'progress', function ( event ) {

		scope.dispatchEvent( { type: 'progress', loaded: event.loaded, total: event.total } );

	}, false );

	xhr.addEventListener( 'error', function () {

		scope.dispatchEvent( { type: 'error', message: 'Couldn\'t load URL [' + url + ']' } );

	}, false );

	if ( xhr.overrideMimeType ) xhr.overrideMimeType( 'text/plain; charset=x-user-defined' );
	xhr.open( 'GET', url, true );
	xhr.responseType = 'arraybuffer';
	xhr.send( null );

};

THREE.M3DLoader.prototype.parse = function ( data ) {

	var geometry, reader, numberOfVertices, numberOfFaces, vertices, offset;
	geometry = new THREE.Geometry();
	reader = new DataView( data );
	vertices = [];
	
	numberOfVertices = reader.getUint32( 0, true );
	
	offset = 4;
	for ( var i = 0; i < numberOfVertices; i++, offset += 12 ) {
		
		vertices.push( new THREE.Vector3( reader.getFloat32( offset, true ), reader.getFloat32( offset + 4, true ), reader.getFloat32( offset + 8, true ) ) );
	
	}
	
	offset += 4 + reader.getUint32( offset, true ) * 12;
	
	numberOfFaces = reader.getUint32( offset, true );
	
	offset += 4;
	for ( var i = 0; i < numberOfFaces; i++ ) {
	
		for ( var j = 0; j < 3; j++, offset += 4 ) {
		
			geometry.vertices.push( vertices[ reader.getUint32( offset, true ) ].clone() );
		
		}
		
		offset += 12;
		
		geometry.faces.push( new THREE.Face3( i * 3, i * 3 + 1, i * 3 + 2 ) );
		
	}
	
	geometry.computeFaceNormals();
	geometry.computeBoundingBox();
	geometry.computeBoundingSphere();

	return geometry;
	
};

THREE.EventDispatcher.prototype.apply( THREE.M3DLoader.prototype );

if ( typeof DataView === 'undefined'){

	DataView = function(buffer, byteOffset, byteLength){

		this.buffer = buffer;
		this.byteOffset = byteOffset || 0;
		this.byteLength = byteLength || buffer.byteLength || buffer.length;
		this._isString = typeof buffer === "string";

	}

	DataView.prototype = {

		_getCharCodes:function(buffer,start,length){
			start = start || 0;
			length = length || buffer.length;
			var end = start + length;
			var codes = [];
			for (var i = start; i < end; i++) {
				codes.push(buffer.charCodeAt(i) & 0xff);
			}
			return codes;
		},

		_getBytes: function (length, byteOffset, littleEndian) {

			var result;

			// Handle the lack of endianness
			if (littleEndian === undefined) {

				littleEndian = this._littleEndian;

			}

			// Handle the lack of byteOffset
			if (byteOffset === undefined) {

				byteOffset = this.byteOffset;

			} else {

				byteOffset = this.byteOffset + byteOffset;

			}

			if (length === undefined) {

				length = this.byteLength - byteOffset;

			}

			// Error Checking
			if (typeof byteOffset !== 'number') {

				throw new TypeError('DataView byteOffset is not a number');

			}

			if (length < 0 || byteOffset + length > this.byteLength) {

				throw new Error('DataView length or (byteOffset+length) value is out of bounds');

			}

			if (this.isString){

				result = this._getCharCodes(this.buffer, byteOffset, byteOffset + length);

			} else {

				result = this.buffer.slice(byteOffset, byteOffset + length);

			}

			if (!littleEndian && length > 1) {

				if (!(result instanceof Array)) {

					result = Array.prototype.slice.call(result);

				}

				result.reverse();
			}

			return result;

		},

		// Compatibility functions on a String Buffer

		getFloat64: function (byteOffset, littleEndian) {

			var b = this._getBytes(8, byteOffset, littleEndian),

				sign = 1 - (2 * (b[7] >> 7)),
				exponent = ((((b[7] << 1) & 0xff) << 3) | (b[6] >> 4)) - ((1 << 10) - 1),

			// Binary operators such as | and << operate on 32 bit values, using + and Math.pow(2) instead
				mantissa = ((b[6] & 0x0f) * Math.pow(2, 48)) + (b[5] * Math.pow(2, 40)) + (b[4] * Math.pow(2, 32)) +
							(b[3] * Math.pow(2, 24)) + (b[2] * Math.pow(2, 16)) + (b[1] * Math.pow(2, 8)) + b[0];

			if (exponent === 1024) {
				if (mantissa !== 0) {
					return NaN;
				} else {
					return sign * Infinity;
				}
			}

			if (exponent === -1023) { // Denormalized
				return sign * mantissa * Math.pow(2, -1022 - 52);
			}

			return sign * (1 + mantissa * Math.pow(2, -52)) * Math.pow(2, exponent);

		},

		getFloat32: function (byteOffset, littleEndian) {

			var b = this._getBytes(4, byteOffset, littleEndian),

				sign = 1 - (2 * (b[3] >> 7)),
				exponent = (((b[3] << 1) & 0xff) | (b[2] >> 7)) - 127,
				mantissa = ((b[2] & 0x7f) << 16) | (b[1] << 8) | b[0];

			if (exponent === 128) {
				if (mantissa !== 0) {
					return NaN;
				} else {
					return sign * Infinity;
				}
			}

			if (exponent === -127) { // Denormalized
				return sign * mantissa * Math.pow(2, -126 - 23);
			}

			return sign * (1 + mantissa * Math.pow(2, -23)) * Math.pow(2, exponent);
		},

		getInt32: function (byteOffset, littleEndian) {
			var b = this._getBytes(4, byteOffset, littleEndian);
			return (b[3] << 24) | (b[2] << 16) | (b[1] << 8) | b[0];
		},

		getUint32: function (byteOffset, littleEndian) {
			return this.getInt32(byteOffset, littleEndian) >>> 0;
		},

		getInt16: function (byteOffset, littleEndian) {
			return (this.getUint16(byteOffset, littleEndian) << 16) >> 16;
		},

		getUint16: function (byteOffset, littleEndian) {
			var b = this._getBytes(2, byteOffset, littleEndian);
			return (b[1] << 8) | b[0];
		},

		getInt8: function (byteOffset) {
			return (this.getUint8(byteOffset) << 24) >> 24;
		},

		getUint8: function (byteOffset) {
			return this._getBytes(1, byteOffset)[0];
		}

	 };

}
