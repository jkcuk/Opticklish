let appName = 'SpiralFresnelFrenzy';
let appDescription = 'the premier AR tool for simulating adaptive spiral Fresnel lenses';

// the status text area
let status;	// = document.createElement('div');
let statusTime;	// the time the last status was posted

// the info text area
let info;	// = document.createElement('div');

// true if stored photo is showing
let showingStoredPhoto = false;
let storedPhoto;
let storedPhotoDescription;
let storedPhotoInfoString;

// my Canon EOS450D
const click = new Audio('./click.m4a');

addEventListenersEtc();

	createInfo();
	refreshInfo();

function addEventListenersEtc() {
	// handle device orientation
	// window.addEventListener("deviceorientation", handleOrientation, true);
	
	// handle window resize
	window.addEventListener("resize", onWindowResize, false);

	// handle screen-orientation (landscape/portrait) change
	screen.orientation.addEventListener( "change", recreateVideoFeeds );

	// share button functionality
	document.getElementById('takePhotoButton').addEventListener('click', takePhoto);

	// toggle fullscreen button functionality
	document.getElementById('fullscreenButton').addEventListener('click', toggleFullscreen);

	// info button functionality
	document.getElementById('infoButton').addEventListener('click', toggleInfoVisibility);

	// back button functionality
	document.getElementById('backButton').addEventListener('click', showLivePhoto);
	document.getElementById('backButton').style.visibility = "hidden";

	// share button
	document.getElementById('shareButton').addEventListener('click', share);
	document.getElementById('shareButton').style.visibility = "hidden";
	if(!(navigator.share)) document.getElementById('shareButton').src="./shareButtonUnavailable.png";
	// if(!(navigator.share)) document.getElementById('shareButton').style.opacity = 0.3;

	// delete button
	document.getElementById('deleteButton').addEventListener('click', deleteStoredPhoto);
	document.getElementById('deleteButton').style.visibility = "hidden";

	// hide the thumbnail for the moment
	document.getElementById('storedPhotoThumbnail').addEventListener('click', showStoredPhoto);
	document.getElementById('storedPhotoThumbnail').style.visibility = "hidden";
	document.getElementById('storedPhoto').addEventListener('click', showLivePhoto);
	document.getElementById('storedPhoto').style.visibility = "hidden";
	// showingStoredPhoto = false;
}

function onWindowResize() {
	screenChanged();
	postStatus(`window size ${window.innerWidth} &times; ${window.innerHeight}`);	// debug
}

async function toggleFullscreen() {
	if (!document.fullscreenElement) {
		document.documentElement.requestFullscreen().catch((err) => {
			postStatus(
				`Error attempting to enable fullscreen mode: ${err.message} (${err.name})`,
			);
		});
	} else {
		document.exitFullscreen();
	}
}

function showStoredPhoto() {
	gui.hide();
	renderer.domElement.style.visibility = "hidden";
	document.getElementById('takePhotoButton').style.visibility = "hidden";
	// document.getElementById('changePositionButton').style.visibility = "hidden";
	document.getElementById('storedPhotoThumbnail').style.visibility = "hidden";
	document.getElementById('backButton').style.visibility = "visible";
	document.getElementById('shareButton').style.visibility = "visible";
	document.getElementById('deleteButton').style.visibility = "visible";
	document.getElementById('storedPhoto').style.visibility = "visible";
	showingStoredPhoto = true;

	postStatus('Showing stored photo, '+storedPhotoDescription);
}

function showLivePhoto() {
	gui.show();
	renderer.domElement.style.visibility = "visible";
	document.getElementById('takePhotoButton').style.visibility = "visible";
	// document.getElementById('changePositionButton').style.visibility = "visible";
	if(storedPhoto) document.getElementById('storedPhotoThumbnail').style.visibility = "visible";
	document.getElementById('backButton').style.visibility = "hidden";
	document.getElementById('shareButton').style.visibility = "hidden";
	document.getElementById('deleteButton').style.visibility = "hidden";
	document.getElementById('storedPhoto').style.visibility = "hidden";
	showingStoredPhoto = false;

	postStatus('Showing live image');
}

function deleteStoredPhoto() {
	storedPhoto = null;

	showLivePhoto();

	postStatus('Stored photo deleted; showing live image');
}

function takePhoto() {
	try {
		click.play();

		storedPhoto = renderer.domElement.toDataURL('image/png');
		storedPhotoInfoString = getInfoString();

		storedPhotoDescription = 
			// `${name}_deltaPhi=${(deltaPhi*180.0/Math.PI).toPrecision(4)}`;
			appName + `_deltaPhi=${(deltaPhi*180.0/Math.PI).toPrecision(4)}`;
		// 
		document.getElementById('storedPhoto').src=storedPhoto;
		document.getElementById('storedPhotoThumbnail').src=storedPhoto;
		document.getElementById('storedPhotoThumbnail').style.visibility = "visible";
	
		postStatus('Photo taken; click thumbnail to view and share');
	} catch (error) {
		console.error('Error:', error);
	}	
}

async function share() {
	try {
		fetch(storedPhoto)
		.then(response => response.blob())
		.then(blob => {
			const file = new File([blob], storedPhotoDescription+'.png', { type: blob.type });

			// create an html blob containing the parameter values
			const blobParams = new Blob(["<html>"+storedPhotoInfoString+"</html>"], { type: "text/html" });
			const fileParams = new File([blobParams], storedPhotoDescription+'.html', { type: blob.type });

			// Use the Web Share API to share the screenshot
			if (navigator.share) {
				navigator.share({
					title: storedPhotoDescription,
					// text: storedPhotoInfoString,
					files: [file, fileParams],
				});
			} else {
				postStatus('Sharing is not supported by this browser.');
			}	
		})
		.catch(error => {
			console.error('Error:', error);
			postStatus(`Error: ${error}`);
		});
	} catch (error) {
		console.error('Error:', error);
	}
}

/** 
 * Add a text field to the bottom left corner of the screen
 */
function createStatus() {
	status = document.getElementById('status');
	// see https://stackoverflow.com/questions/15248872/dynamically-create-2d-text-in-three-js
	// status.style.position = 'absolute';
	// status.style.backgroundColor = "rgba(0, 0, 0, 0.3)";	// semi-transparent black
	// status.style.color = "White";
	// status.style.fontFamily = "Arial";
	// status.style.fontSize = "9pt";
	// status.style.bottom = 0 + 'px';
	// status.style.left = 0 + 'px';
	// status.style.zIndex = 1;
	// document.body.appendChild(status);	
	postStatus("Welcome to SpiralFresnelFrenzy, the premier AR simulation tool for adaptive spiral Fresnel lenses!");
}

function postStatus(text) {
	status.innerHTML = '&nbsp;'+text;
	console.log('status: '+text);

	// show the text only for 3 seconds
	statusTime = new Date().getTime();
	setTimeout( () => { if(new Date().getTime() - statusTime > 2999) status.innerHTML = '&nbsp;'+appName+', University of Glasgow, <a href="https://github.com/jkcuk/'+appName+'">https://github.com/jkcuk/'+appName+'</a>' }, 3000);
}

function getInfoString() {
	return `<h4>Spiral Fresnel lens</h4>\n` +
		'Components shown = ' + show2String() + '<br>\n' +
		// `Show component 1 `+ (raytracingSphereShaderMaterial.uniforms.visible1.value?'&check;':'&cross;')+`<br>\n` +
		// `Show component 2 `+ (raytracingSphereShaderMaterial.uniforms.visible2.value?'&check;':'&cross;')+`<br>\n` +
		`Rotation angle, &Delta;&phi; = ${(deltaPhi*180.0/Math.PI).toPrecision(4)}&deg;<br>\n` +
		'Spiral type = ' + cylindricalLensSpiralType2String() + '<br>\n' +
		`Winding parameter, <i>b</i> = ${raytracingSphereShaderMaterial.uniforms.b.value.toPrecision(4)}<br>\n` +	// winding parameter of the spiral
		`<i>f</i><sub>1</sub> = ${raytracingSphereShaderMaterial.uniforms.f1.value.toPrecision(4)}<br>\n` +	// focal length of cylindrical lens 1 (for Arch. spiral at r=1, for hyp. spiral at phi=1)
		`&Delta;<i>z</i> = ${deltaZ.toPrecision(4)}<br>\n` +
		'Winding focussing = ' + windingFocussing2String() + '<br>\n' +
		(((windingFocussing === 2) && ((raytracingSphereShaderMaterial.uniforms.cylindricalLensSpiralType.value != 0) || (deltaPhi < 0))) ? '<span style="color:red;">*** Warning: separation-based winding focussing only works for logarithmic-spiral lenses and &Delta;&phi; > 0! ***</span><br>\n' : '') +
		// 'Alvarez winding focussing ' + (raytracingSphereShaderMaterial.uniforms.alvarezWindingFocusing.value?'&check;':'&cross;')+`<br>\n` +
		`Clear-aperture radius = ${raytracingSphereShaderMaterial.uniforms.radius.value.toPrecision(4)}<br>\n` +	// radius of the Fresnel lens
		// `<h4>Equivalent lens</h4>\n` +
		// `Show instead of spiral Fresnel lens `+ (raytracingSphereShaderMaterial.uniforms.showEquivalentLens.value?'&check;':'&cross;')+`<br>\n` +
		`Focal length, <i>F</i> = ${calculateEquivalentLensF().toPrecision(4)}\n` +
		// 'Lenslet type: '+(raytracingSphereShaderMaterial.uniforms.idealLenses.value?'Ideal thin lenses':'Phase holograms') + "<br>\n" +
		'<h4>Background</h4>\n' +
		`Image = ` + background2String() + `<br>\n` +
 		`Distance from origin = ${raytracingSphereShaderMaterial.uniforms.videoDistance.value.toPrecision(4)}<br>\n` +	// (user-facing) camera
		`Horizontal field of view = ${fovBackground.toPrecision(4)}&deg;\n` +
		// `User-facing camera = ${fovVideoFeedU.toPrecision(4)}&deg;<br>\n` +	// (user-facing) camera
		// `Environment-facing camera = ${fovVideoFeedE.toPrecision(4)}&deg;<br>\n` +	// (environment-facing) camera
		`<h4>Virtual camera</h4>\n` +
		`Position = (${camera.position.x.toPrecision(4)}, ${camera.position.y.toPrecision(4)}, ${camera.position.z.toPrecision(4)})<br>\n` +
		`Horiz. FOV = ${fovScreen.toPrecision(4)}<br>\n` +
		`Aperture radius = ${apertureRadius.toPrecision(4)}<br>\n` +
		`Focussing distance = ${Math.tan(atanFocusDistance).toPrecision(4)}<br>\n` +
		`Number of rays = ${noOfRays}\n` +
		`<h4>Stored photo information</h4>\n` +
		`description/name = ${storedPhotoDescription}\n` +
		'<h4>Background image information</h4>\n' +
		// 'Earthrise: <a href="https://en.wikipedia.org/wiki/File:NASA-Apollo8-Dec24-Earthrise.jpg">https://en.wikipedia.org/wiki/File:NASA-Apollo8-Dec24-Earthrise.jpg</a><br>\n' +
		'"Buzz Aldrin": based on <a href="https://en.wikipedia.org/wiki/File:Aldrin_Apollo_11.jpg">https://en.wikipedia.org/wiki/File:Aldrin_Apollo_11.jpg</a><br>\n' +
		// 'Pillars of creation: <a href="https://commons.wikimedia.org/wiki/File:Pillars_2014_HST_denoise_0.6_12.jpg">https://commons.wikimedia.org/wiki/File:Pillars_2014_HST_denoise_0.6_12.jpg</a><br>\n' +
		// 'Lunch atop a skyscraper: <a href="https://en.wikipedia.org/wiki/File:Lunch_atop_a_Skyscraper_-_Charles_Clyde_Ebbets.jpg">https://en.wikipedia.org/wiki/File:Lunch_atop_a_Skyscraper_-_Charles_Clyde_Ebbets.jpg</a><br>\n' +
		'"Dr TIM" and "Descent from Half Dome": own work by the authors<br>\n' +
		'All images used are in the public domain.<br>\n' +
		`<h4>${appName}</h4>\n` +
		`${appName} is ${appDescription}.`
		;
		console.log("*");
}

function refreshInfo() {
	if(showingStoredPhoto) setInfo( storedPhotoInfoString );
	else setInfo( getInfoString() );

	if(info.style.visibility === "visible") setTimeout( refreshInfo , 100);	// refresh again a while
}

/** 
 * Add a text field to the top left corner of the screen
 */
function createInfo() {
	info = document.getElementById('info');
	info.innerHTML = "-- nothing to show (yet) --";
}

function setInfo(text) {
	info.innerHTML = text;
	// console.log('info: '+text);
}

function toggleInfoVisibility() {
	switch(info.style.visibility) {
		case "visible":
			info.style.visibility = "hidden";
			break;
		case "hidden":
		default:
			info.style.visibility = "visible";
			refreshInfo();
	}
}