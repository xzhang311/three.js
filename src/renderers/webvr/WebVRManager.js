/**
 * @author mrdoob / http://mrdoob.com/
 */

import { Matrix4 } from '../../math/Matrix4.js';
import { Vector4 } from '../../math/Vector4.js';
import { ArrayCamera } from '../../cameras/ArrayCamera.js';
import { PerspectiveCamera } from '../../cameras/PerspectiveCamera.js';

function WebVRManager( renderer ) {

	var scope = this;

	var device = null;
	var frameData = null;

	var poseTarget = null;

	if ( typeof window !== 'undefined' && 'VRFrameData' in window ) {

		frameData = new window.VRFrameData();

	}

	var matrixWorldInverse = new Matrix4();

	var standingMatrix = new Matrix4();
	var standingMatrixInverse = new Matrix4();

	var cameraL = new PerspectiveCamera();
	cameraL.bounds = new Vector4( 0.0, 0.0, 0.5, 1.0 );
	cameraL.layers.enable( 1 );

	var cameraR = new PerspectiveCamera();
	cameraR.bounds = new Vector4( 0.5, 0.0, 0.5, 1.0 );
	cameraR.layers.enable( 2 );

	var cameraVR = new ArrayCamera( [ cameraL, cameraR ] );
	cameraVR.layers.enable( 1 );
	cameraVR.layers.enable( 2 );

	//

	var currentSize, currentPixelRatio;

	function onVRDisplayPresentChange() {

		if ( device !== null && device.isPresenting ) {

			var eyeParameters = device.getEyeParameters( 'left' );
			var renderWidth = eyeParameters.renderWidth;
			var renderHeight = eyeParameters.renderHeight;

			currentPixelRatio = renderer.getPixelRatio();
			currentSize = renderer.getSize();

			renderer.setDrawingBufferSize( renderWidth * 2, renderHeight, 1 );

		} else if ( scope.enabled ) {

			renderer.setDrawingBufferSize( currentSize.width, currentSize.height, currentPixelRatio );

		}

	}

	if ( typeof window !== 'undefined' ) {

		window.addEventListener( 'vrdisplaypresentchange', onVRDisplayPresentChange, false );

	}

	//

	this.enabled = false;
	this.standing = false;

	this.getDevice = function () {

		return device;

	};

	this.setDevice = function ( value ) {

		if ( value !== undefined ) device = value;

	};

	this.setPoseTarget = function ( object ) {

		if ( object !== undefined ) poseTarget = object;

	};

	this.getCamera = function ( camera ) {

		if ( device === null ) return camera;

		device.depthNear = camera.near;
		device.depthFar = camera.far;

		device.getFrameData( frameData );

		//

		var pose = frameData.pose;
		var poseObject;

		if ( poseTarget !== null ) {

			poseObject = poseTarget;

		} else {

			poseObject = camera;

		}

		if ( pose.position !== null ) {

			poseObject.position.fromArray( pose.position );

		} else {

			poseObject.position.set( 0, 0, 0 );

		}

		if ( pose.orientation !== null ) {

			poseObject.quaternion.fromArray( pose.orientation );

		}

		poseObject.updateMatrixWorld();

		var stageParameters = device.stageParameters;

		if ( this.standing && stageParameters ) {

			standingMatrix.fromArray( stageParameters.sittingToStandingTransform );
			standingMatrixInverse.getInverse( standingMatrix );

			camera.matrixWorld.multiply( standingMatrix );
			camera.matrixWorldInverse.multiply( standingMatrixInverse );

		}

		if ( device.isPresenting === false ) return camera;

		//

		cameraL.near = camera.near;
		cameraR.near = camera.near;

		cameraL.far = camera.far;
		cameraR.far = camera.far;

		cameraVR.matrixWorld.copy( camera.matrixWorld );
		cameraVR.matrixWorldInverse.copy( camera.matrixWorldInverse );

		cameraL.matrixWorldInverse.fromArray( frameData.leftViewMatrix );
		cameraR.matrixWorldInverse.fromArray( frameData.rightViewMatrix );

		if ( this.standing && stageParameters ) {

			cameraL.matrixWorldInverse.multiply( standingMatrixInverse );
			cameraR.matrixWorldInverse.multiply( standingMatrixInverse );

		}

		var parent = camera.parent;

		if ( parent !== null ) {

			matrixWorldInverse.getInverse( parent.matrixWorld );

			cameraL.matrixWorldInverse.multiply( matrixWorldInverse );
			cameraR.matrixWorldInverse.multiply( matrixWorldInverse );

		}

		// envMap and Mirror needs camera.matrixWorld

		cameraL.matrixWorld.getInverse( cameraL.matrixWorldInverse );
		cameraR.matrixWorld.getInverse( cameraR.matrixWorldInverse );

		cameraL.projectionMatrix.fromArray( frameData.leftProjectionMatrix );
		cameraR.projectionMatrix.fromArray( frameData.rightProjectionMatrix );

		// HACK @mrdoob
		// https://github.com/w3c/webvr/issues/203

		cameraVR.projectionMatrix.copy( cameraL.projectionMatrix );

		//

		var layers = device.getLayers();

		if ( layers.length ) {

			var layer = layers[ 0 ];

			if ( layer.leftBounds !== null && layer.leftBounds.length === 4 ) {

				cameraL.bounds.fromArray( layer.leftBounds );

			}

			if ( layer.rightBounds !== null && layer.rightBounds.length === 4 ) {

				cameraR.bounds.fromArray( layer.rightBounds );

			}

		}

		return cameraVR;

	};

	this.getStandingMatrix = function () {

		return standingMatrix;

	};

	this.submitFrame = function () {

		if ( device && device.isPresenting ) device.submitFrame();

	};

	this.dispose = function () {

		if ( typeof window !== 'undefined' ) {

			window.removeEventListener( 'vrdisplaypresentchange', onVRDisplayPresentChange );

		}

	};

}

export { WebVRManager };
