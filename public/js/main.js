const audioContext = new AudioContext()
const cache = {
	/* soundId: buffer */
}

const offsetRef = firebase.database().ref(".info/serverTimeOffset");
const soundRef = firebase.database().ref('sound')

let offset = 0 // Diff from server time

/**
 * Get estimated server time.
 */
function estimatedServerTime() {
	return Date.now() + offset
}

// Set offset
offsetRef.once('value')
	.then((snap) => {
		offset = snap.val();
	})
	.then(_ => {

		// Receive firebase event and play sound
		soundRef.on('value', (snapshot) => {
			let sound = snapshot.val()
			if (sound) {
				let timeFromLastSound = Math.abs(sound.time - estimatedServerTime())

				// Ignore far past events
				if (timeFromLastSound < 1000) {
					play(sound.id)
				}
			}
		})

	})

/**
 * Play sound with id.
 * @param {string} soundId 
 */
function play(soundId) {

	let cachedBuffer = cache[soundId]
	if (cachedBuffer) {
		playBuffer(cachedBuffer)
		return
	}

	// Get audio from server
	let audioURL = `audio/${soundId}.ogg`
	let request = new XMLHttpRequest();
	request.open('GET', audioURL, true);
	request.responseType = 'arraybuffer';
	request.onload = (ev) => {

		// Decode audio and cache it
		audioContext.decodeAudioData(ev.target.response, (buffer) => {
			cache[soundId] = buffer

			// Play
			playBuffer(buffer)
		})
	}
	request.send();
}

/**
 * Play decoded sound data.
 * @param {ArrayBuffer} buffer 
 */
function playBuffer(buffer) {
	let bufferSourceNode = audioContext.createBufferSource()
	bufferSourceNode.buffer = buffer
	bufferSourceNode.start()
	bufferSourceNode.connect(audioContext.destination)
}

// Attach click events to buttons
$('#drumpad')
	.on('click', 'a', function () {

		let sounds = $(this).data('sound').split(',')
		let soundId = sounds[Math.floor(Math.random() * sounds.length)]

		// Update database value
		return soundRef.set({
			id: soundId,
			time: estimatedServerTime()
		})
	})
