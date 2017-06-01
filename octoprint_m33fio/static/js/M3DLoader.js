/**
 * @author donovan6000 / http://exploitkings.com
 */


THREE.M3DLoader = function ( manager ) {

	this.manager = ( manager !== undefined ) ? manager : THREE.DefaultLoadingManager;

};

THREE.M3DLoader.prototype = {

	constructor: THREE.M3DLoader,

	load: function ( url, onLoad, onProgress, onError ) {

		var scope = this;

		var loader = new THREE.FileLoader( scope.manager );
		loader.setResponseType( 'arraybuffer' );
		loader.load( url, function ( text ) {

			onLoad( scope.parse( text ) );

		}, onProgress, onError );

	},

	parse: function ( data ) {

		var reader = new DataView( data );

		var numberOfVertices = reader.getUint32( 0, true );
		var offset = 4;
		
		var vertices = [];
		for ( var i = 0; i < numberOfVertices; i++, offset += 12 ) {
		
			vertices.push( new THREE.Vector3( reader.getFloat32( offset, true ), reader.getFloat32( offset + 4, true ), reader.getFloat32( offset + 8, true ) ) );

		}
		
		var numberOfNormals = reader.getUint32( offset, true );
		offset += 4;
		
		var normals = [];
		for ( var i = 0; i < numberOfNormals; i++, offset += 12 ) {
		
			normals.push( new THREE.Vector3( reader.getFloat32( offset, true ), reader.getFloat32( offset + 4, true ), reader.getFloat32( offset + 8, true ) ) );
	
		}
		
		var numberOfFaces = reader.getUint32( offset, true );
		offset += 4;
		
		var geometryVertices = [];
		var geometryNormals = [];
		for ( var i = 0; i < numberOfFaces; i++ ) {
	
			for ( var j = 0; j < 3; j++, offset += 4 ) {
			
				var vertex = vertices[ reader.getUint32( offset, true ) ];
		
				geometryVertices.push( vertex.x, vertex.y, vertex.z );
			}
		
			var vertexNormals = [];
			for ( var j = 0; j < 3; j++, offset += 4 ) {
			
				var normal = normals[ reader.getUint32( offset, true ) ];
		
				geometryNormals.push( normal.x, normal.y, normal.z );
			}
		}
		
		var geometry = new THREE.BufferGeometry();
		geometry.addAttribute( 'position', new THREE.BufferAttribute( new Float32Array( geometryVertices ), 3 ) );
		geometry.addAttribute( 'normal', new THREE.BufferAttribute( new Float32Array( geometryNormals ), 3 ) );

		return geometry;

	}

};
