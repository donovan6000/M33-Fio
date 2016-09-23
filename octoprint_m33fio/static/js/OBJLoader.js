/**
 * @author mrdoob / http://mrdoob.com/
 * @author donovan6000 / http://exploitkings.com
 */


THREE.OBJLoader = function () {};

THREE.OBJLoader.prototype = {

	constructor: THREE.OBJLoader

};

THREE.OBJLoader.prototype.load = function ( url, callback ) {

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
	xhr.responseType = 'text';
	xhr.send( null );

};

THREE.OBJLoader.prototype.parse = function ( data ) {

	var geometry, vertices, triangles, expression, lines, references, vertexReferences, coordinates, vertex;
	vertices = [];
	triangles = [];
	expression = /\S+/g;
	geometry = new THREE.Geometry();
	lines = data.split('\n');
	
	for ( var i = 0; i < lines.length; i++ ) {
					
		if ( lines[ i ][ 0 ] == 'f' ) {
		
			references = lines[ i ].substr( 1 ).match( expression );
			
			vertexReferences = [];
			
			for ( var j = 0; j < references.length; j++ )
				vertexReferences.push( references[ j ].split( '/' )[0] );
			
			for ( var j = 0; j < vertexReferences.length - 2; j++ )
			
				triangles.push( [ vertexReferences[ 0 ], vertexReferences[ j + 1 ], vertexReferences[ j + 2 ] ] )
		
		}
		
		else if ( lines[ i ].substr( 0, 2 ) == "v " ) {
		
			coordinates = lines[ i ].substr( 1 ).match( expression );
			
			vertices.push( [ coordinates[ 0 ], coordinates[ 1 ], coordinates[ 2 ] ] );
			
		}
	}
	
	for ( var i = 0; i < triangles.length; i++ ) {
	
		for ( var j = 0; j < 3; j++ ) {
	
			vertex = vertices[ triangles[ i ][ j ] - 1 ];
		
			geometry.vertices.push( new THREE.Vector3( parseFloat( vertex[ 0 ] ), parseFloat( vertex[ 1 ] ), parseFloat( vertex[ 2 ] ) ) );
		
		}
		
		geometry.faces.push( new THREE.Face3( i * 3, i * 3 + 1, i * 3 + 2 ) );
		
	}

	geometry.computeFaceNormals();
	geometry.computeBoundingBox();
	geometry.computeBoundingSphere();

	return geometry;
	
};

THREE.EventDispatcher.prototype.apply( THREE.OBJLoader.prototype );
