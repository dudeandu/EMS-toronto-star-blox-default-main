// Start paywall detection code (you can keep/modify this if you need it)

window.addEventListener('DOMContentLoaded', function() {
    // Get url params
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    const mode = urlParams.get('mode')

    // Check if user is in app or web
    if (window.__tnt === undefined || mode === "chromeless" || window.__tnt.isPreview() > 0) {
        // User is in app so run the access granted function
        accessGrantedFunction();

    } else {
        // User is in web

        // Add function to access denied event
        window.__tnt.subscription.d.push(function(e) {
            // User does not have access
            accessDeniedFunction();
        })

        // Add function to access granted event
        window.__tnt.subscription.a.push(function(e) {
            // User has access
            accessGrantedFunction();
        })
    }
});

function accessGrantedFunction() {
    // Insert your access granted code here
}

function accessDeniedFunction() {
    // Insert your access granted code here
}

// Opening timeline

function updateOpeningTimeline(response) {
    const wrapper = response && response.element && response.element.classList.contains('SA_opening-timeline__scrolly')
        ? response.element
        : document.querySelector('.SA_opening-timeline__scrolly');
    if (!wrapper) return;

    const timeline = wrapper.querySelector('[data-opening-timeline-track]');
    if (!timeline) return;

    const wrapperRect = wrapper.getBoundingClientRect();
    const scrollableDistance = Math.max(1, wrapper.offsetHeight - window.innerHeight);
    const progress = Math.max(0, Math.min(1, -wrapperRect.top / scrollableDistance));
    timeline.style.setProperty('--timeline-offset', `${progress * -100}%`);

    const soundChoice = wrapper.querySelector('.SA_opening-timeline__sound-choice');
    if (soundChoice) {
        const fadeProgress = Math.max(0, Math.min(1, (progress - 0.1) / 0.06));
        soundChoice.style.setProperty('--sound-choice-opacity', String(1 - fadeProgress));
        soundChoice.style.setProperty('--sound-choice-shift', `${fadeProgress * 1.5}rem`);
        soundChoice.style.pointerEvents = fadeProgress > 0.85 ? 'none' : 'auto';
        soundChoice.setAttribute('aria-hidden', fadeProgress > 0.85 ? 'true' : 'false');
        soundChoice.querySelectorAll('button').forEach(function(button) {
            button.tabIndex = fadeProgress > 0.85 ? -1 : 0;
        });
    }

    timeline.querySelectorAll('[data-timeline-point]').forEach(function(point) {
        const pointProgress = Number(point.dataset.timelinePoint);
        point.classList.toggle('SA_opening-timeline__tick--visible', progress >= pointProgress);
    });
}

function prepareTimelineTranscript(transcript) {
    if (!transcript || transcript.dataset.prepared === 'true') return;

    const originalNodes = Array.from(transcript.childNodes);
    const lines = [];
    let currentLine = null;

    originalNodes.forEach(function(node) {
        if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'STRONG') {
            currentLine = document.createElement('span');
            currentLine.className = 'SA_opening-timeline__transcript-line';

            const speaker = node.textContent.toLowerCase().includes('dispatcher') ? 'dispatcher' : 'caller';
            node.classList.add(`SA_opening-timeline__speaker--${speaker}`);
            currentLine.appendChild(node);
            lines.push(currentLine);
        } else if (currentLine) {
            currentLine.appendChild(node);
        }
    });

    if (lines.length) {
        transcript.replaceChildren(...lines);
    }

    const textNodes = [];
    const walker = document.createTreeWalker(transcript, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) textNodes.push(walker.currentNode);

    let wordIndex = 0;
    textNodes.forEach(function(textNode) {
        const fragment = document.createDocumentFragment();
        textNode.nodeValue.split(/(\s+)/).forEach(function(token) {
            if (!token || /^\s+$/.test(token)) {
                fragment.appendChild(document.createTextNode(token));
                return;
            }

            const wordElement = document.createElement('span');
            wordElement.className = 'SA_opening-timeline__word';
            wordElement.dataset.wordIndex = wordIndex++;
            wordElement.textContent = token;
            fragment.appendChild(wordElement);
        });
        textNode.parentNode.replaceChild(fragment, textNode);
    });

    transcript.dataset.wordCount = wordIndex;
    transcript.dataset.prepared = 'true';
}

function updateTimelineTranscript(audio) {
    const transcript = document.getElementById(audio.dataset.transcriptId);
    if (!transcript) return;

    const start = Number(audio.dataset.segmentStart);
    const end = Number(audio.dataset.segmentEnd);
    const progress = Math.max(0, Math.min(1, (audio.currentTime - start) / (end - start)));
    const visibleWords = Math.round(progress * Number(transcript.dataset.wordCount));

    transcript.querySelectorAll('.SA_opening-timeline__word').forEach(function(word) {
        word.classList.toggle('SA_opening-timeline__word--heard', Number(word.dataset.wordIndex) < visibleWords);
    });
}

function playTimelineTranscript(audioId, transcriptId, startTime, endTime) {
    const audio = document.getElementById(audioId);
    const transcript = document.getElementById(transcriptId);
    if (!audio || !transcript) return;

    prepareTimelineTranscript(transcript);
    audio.dataset.transcriptId = transcriptId;
    audio.dataset.segmentStart = startTime;
    audio.dataset.segmentEnd = endTime;
    audio.currentTime = Number(startTime);
    updateTimelineTranscript(audio);

    document.querySelectorAll('.SA_opening-timeline audio').forEach(function(otherAudio) {
        if (otherAudio !== audio) otherAudio.pause();
    });

    const playAttempt = audio.play();
    if (playAttempt && typeof playAttempt.catch === 'function') {
        playAttempt.catch(function() {
            const button = transcript.parentNode.querySelector('.SA_opening-timeline__mute');
            if (button) button.textContent = 'Play audio';
        });
    }
}

function pauseTimelineAudio(audioId) {
    const audio = document.getElementById(audioId);
    if (audio) audio.pause();
}

function stopOpeningTimelineAudio() {
    document.querySelectorAll('.SA_opening-timeline audio').forEach(function(audio) {
        audio.pause();
    });
}

document.addEventListener('DOMContentLoaded', function() {
    const openingTimeline = document.querySelector('.SA_opening-timeline');
    if (openingTimeline) {
        window.setTimeout(function() {
            openingTimeline.classList.add('SA_opening-timeline--revealed');
        }, 350);
    }

    let timelineFrameRequested = false;
    function requestTimelineUpdate() {
        if (timelineFrameRequested) return;
        timelineFrameRequested = true;
        window.requestAnimationFrame(function() {
            updateOpeningTimeline();
            timelineFrameRequested = false;
        });
    }

    window.addEventListener('scroll', requestTimelineUpdate, { passive: true });
    window.addEventListener('resize', requestTimelineUpdate);
    requestTimelineUpdate();

    document.querySelectorAll('.SA_opening-timeline__transcript').forEach(prepareTimelineTranscript);

    document.querySelectorAll('.SA_opening-timeline audio').forEach(function(audio) {
        audio.muted = false;
        audio.addEventListener('timeupdate', function() {
            updateTimelineTranscript(audio);
            if (audio.dataset.segmentEnd && audio.currentTime >= Number(audio.dataset.segmentEnd)) audio.pause();
        });
    });

    let timelineAudioUnlocked = false;
    function unlockTimelineAudio() {
        if (timelineAudioUnlocked) return;
        timelineAudioUnlocked = true;

        document.querySelectorAll('.SA_opening-timeline audio').forEach(function(audio) {
            const wasMuted = audio.muted;
            audio.muted = true;
            const unlockAttempt = audio.play();

            if (unlockAttempt && typeof unlockAttempt.then === 'function') {
                unlockAttempt.then(function() {
                    audio.pause();
                    audio.currentTime = 0;
                    audio.muted = wasMuted;
                }).catch(function() {
                    timelineAudioUnlocked = false;
                    audio.muted = wasMuted;
                });
            }
        });
    }

    ['pointerdown', 'touchstart', 'keydown'].forEach(function(eventName) {
        document.addEventListener(eventName, unlockTimelineAudio, { once: true, passive: true });
    });

    document.querySelectorAll('[data-timeline-sound]').forEach(function(button) {
        const soundIsDefault = button.dataset.timelineSound === 'on';
        button.setAttribute('aria-pressed', soundIsDefault ? 'true' : 'false');

        button.addEventListener('click', function() {
            const soundIsOn = button.dataset.timelineSound === 'on';
            document.querySelectorAll('.SA_opening-timeline audio').forEach(function(audio) {
                audio.muted = !soundIsOn;
            });

            document.querySelectorAll('[data-timeline-sound]').forEach(function(soundButton) {
                const selected = soundButton === button;
                soundButton.setAttribute('aria-pressed', selected ? 'true' : 'false');
            });

            document.querySelectorAll('.SA_opening-timeline__mute').forEach(function(audioButton) {
                audioButton.setAttribute('aria-pressed', soundIsOn ? 'false' : 'true');
                audioButton.textContent = soundIsOn ? 'Mute audio' : 'Unmute audio';
            });
        });
    });

    document.querySelectorAll('.SA_opening-timeline__mute').forEach(function(button) {
        button.setAttribute('aria-pressed', 'false');
        button.textContent = 'Mute audio';

        button.addEventListener('click', function() {
            const audio = document.getElementById(button.dataset.audioId);
            if (!audio) return;

            if (audio.muted) {
                audio.muted = false;
                if (audio.paused) audio.play();
            } else if (audio.paused) {
                audio.play();
            } else {
                audio.muted = true;
            }

            document.querySelectorAll(`[data-audio-id="${button.dataset.audioId}"]`).forEach(function(audioButton) {
                audioButton.setAttribute('aria-pressed', audio.muted ? 'true' : 'false');
                audioButton.textContent = audio.muted ? 'Unmute audio' : 'Mute audio';
            });
        });
    });
});

// End paywall detection code

// Start example functions

function progressFunction(response) {
    document.querySelector('#SA_coloured-square').style.transform = 'translate(-50%, -50%) rotate(' + translateRange(response.progress, 0, 1, 0, 360) + 'deg)';
}

function changeSquareColour(colour) {
    document.querySelector('#SA_coloured-square').style.background = colour;
}

function wrapperEnterCallback() {
    console.log('The square animation scrollytelling section has started')
}

function wrapperExitCallback() {
    console.log('The square animation scrollytelling section has ended')
}

function wrapperProgressCallback(response) {
    console.log('The square animation scrollytelling section has progressed to: ' + response.progress)
}

// End example functions


// Start documentation code


document.querySelector("#insert-breaking-code").innerHTML = "<xmp><!--build:js js/script.min.js --></xmp> and <xmp><!--endbuild--></xmp> "

// add message

var message = newElement('div', { className: 'warning_message' }, [
        newText("Before you start your project please delete all the code in custom.js and _custom.scss This message will stop appearing once you do so.")
    ]);

    document.querySelector('body').appendChild(message)


// var newImg = new Image;
// newImg.onload = function() {
//     console.log('Image successfully loaded from: ' + imagePath('milliken-park.jpg'))
// }
// newImg.src = imagePath('milliken-park.jpg');

// create TOC

var tocEls = document.querySelectorAll(".SA_text-wrap .SA_h1,.SA_text-wrap .SA_h2,.SA_text-wrap .SA_h3,.SA_text-wrap .SA_h4,.SA_text-wrap .SA_h5,.SA_text-wrap .SA_h6")

tocEls.forEach(el => {
    el.id = el.innerText.replace(/\s/g, '');
    var node = newElement('a', { className: 'SA_toc-item ' + el.className, href: '#' + el.id }, [
        newText(el.innerText)
    ]);

    document.querySelector("#SA_toc").appendChild(node)

})

// End documentation code
