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
    const scrolledDistance = Math.max(0, -wrapperRect.top);
    const overallProgress = Math.max(0, Math.min(1, scrolledDistance / scrollableDistance));
    const timelineStart = wrapper.querySelector('[data-opening-timeline-start]');
    const timelineStartDistance = timelineStart
        ? Math.max(0, timelineStart.offsetTop - window.innerHeight * 0.5)
        : 0;
    const timelineAnchorY = parseFloat(window.getComputedStyle(timeline).top) || window.innerHeight * 0.5;
    const timelineAnchors = Array.from(wrapper.querySelectorAll('[data-opening-timeline-progress]')).map(function(slide) {
        const time = slide.querySelector('.SA_opening-timeline__time');
        const timeCentre = time
            ? time.getBoundingClientRect().top + time.offsetHeight * 0.5
            : slide.getBoundingClientRect().top + slide.offsetHeight * 0.5;
        return {
            distance: Math.max(0, scrolledDistance + timeCentre - timelineAnchorY),
            progress: Number(slide.dataset.openingTimelineProgress)
        };
    });
    let timelineProgress = 0;

    if (timelineAnchors.length) {
        const finalAnchor = timelineAnchors[timelineAnchors.length - 1];
        const anchors = timelineAnchors.concat([{ distance: scrollableDistance, progress: 1 }]);

        if (scrolledDistance >= finalAnchor.distance) {
            const remainingDistance = Math.max(1, scrollableDistance - finalAnchor.distance);
            const segmentProgress = (scrolledDistance - finalAnchor.distance) / remainingDistance;
            timelineProgress = finalAnchor.progress + segmentProgress * (1 - finalAnchor.progress);
        } else {
            for (let index = 0; index < timelineAnchors.length - 1; index += 1) {
                const startAnchor = anchors[index];
                const endAnchor = anchors[index + 1];
                if (scrolledDistance >= startAnchor.distance && scrolledDistance <= endAnchor.distance) {
                    const segmentDistance = Math.max(1, endAnchor.distance - startAnchor.distance);
                    const segmentProgress = (scrolledDistance - startAnchor.distance) / segmentDistance;
                    timelineProgress = startAnchor.progress + segmentProgress * (endAnchor.progress - startAnchor.progress);
                    break;
                }
            }
        }
    }

    timelineProgress = Math.max(0, Math.min(1, timelineProgress));
    const timelineReveal = Math.max(0, Math.min(1, (scrolledDistance - timelineStartDistance) / Math.max(1, window.innerHeight * 0.12)));
    const fadeoutSlide = wrapper.querySelector('[data-opening-fadeout]');
    let endingFade = 0;
    if (fadeoutSlide) {
        const fadeoutRect = fadeoutSlide.getBoundingClientRect();
        endingFade = Math.max(0, Math.min(1, (window.innerHeight * 0.72 - fadeoutRect.top) / (window.innerHeight * 0.25)));
    }
    timeline.style.setProperty('--timeline-offset', `${timelineProgress * -100}%`);
    timeline.style.setProperty('--timeline-opacity', String(timelineReveal * (1 - endingFade)));

    const background = wrapper.querySelector('.SA_opening-timeline__background');
    if (background) {
        background.style.setProperty('--timeline-image-scale', String(1.06 + overallProgress * 0.07));
        background.style.setProperty('--timeline-image-y', `${overallProgress * -1.5}vh`);
        background.style.setProperty('--timeline-blackout-opacity', String(endingFade));
    }

    const soundChoice = wrapper.querySelector('.SA_opening-timeline__sound-choice');
    if (soundChoice) {
        const fadeProgress = Math.max(0, Math.min(1, (timelineProgress - 0.1) / 0.06));
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
        point.classList.toggle('SA_opening-timeline__tick--visible', timelineProgress >= pointProgress);
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

function playTimelineAudio(audioId, startTime, endTime) {
    const audio = document.getElementById(audioId);
    if (!audio) return;

    delete audio.dataset.transcriptId;
    audio.dataset.segmentStart = startTime;
    audio.dataset.segmentEnd = endTime;
    audio.currentTime = Number(startTime);

    document.querySelectorAll('.SA_opening-timeline audio').forEach(function(otherAudio) {
        if (otherAudio !== audio) otherAudio.pause();
    });

    const playAttempt = audio.play();
    if (playAttempt && typeof playAttempt.catch === 'function') {
        playAttempt.catch(function() {
            document.querySelectorAll(`.SA_opening-timeline__mute[data-audio-id="${audioId}"]`).forEach(function(button) {
                button.textContent = 'Play audio';
            });
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

function initializeOpeningAudioPlayer(audio) {
    const player = document.createElement('div');
    player.className = 'SA_opening-timeline__custom-player';
    player.hidden = true;
    player.innerHTML = '<button class="SA_opening-timeline__player-toggle" type="button" aria-label="Play audio">▶</button><input class="SA_opening-timeline__player-progress" type="range" min="0" max="1" step="0.01" value="0" aria-label="Audio progress"><output class="SA_opening-timeline__player-time">0:00 / 0:00</output><button class="SA_opening-timeline__player-mute" type="button" aria-label="Mute audio" aria-pressed="false">Sound on</button>';
    audio.insertAdjacentElement('afterend', player);

    const toggle = player.querySelector('.SA_opening-timeline__player-toggle');
    const progress = player.querySelector('.SA_opening-timeline__player-progress');
    const time = player.querySelector('.SA_opening-timeline__player-time');
    const mute = player.querySelector('.SA_opening-timeline__player-mute');

    function formatAudioTime(value) {
        const seconds = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
        return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
    }

    function limits() {
        const start = Number(audio.dataset.segmentStart) || 0;
        const requestedEnd = Number(audio.dataset.segmentEnd);
        const end = requestedEnd > start ? requestedEnd : (Number.isFinite(audio.duration) ? audio.duration : start);
        return { start: start, end: end };
    }

    function updatePlayer() {
        const range = limits();
        const duration = Math.max(0, range.end - range.start);
        const elapsed = Math.max(0, Math.min(duration, audio.currentTime - range.start));
        progress.max = String(duration || 1);
        progress.value = String(elapsed);
        progress.style.setProperty('--audio-progress', `${duration ? elapsed / duration * 100 : 0}%`);
        time.textContent = `${formatAudioTime(elapsed)} / ${formatAudioTime(duration)}`;
        toggle.textContent = audio.paused ? '▶' : 'Ⅱ';
        toggle.setAttribute('aria-label', audio.paused ? 'Play audio' : 'Pause audio');
        mute.textContent = audio.muted ? 'Sound off' : 'Sound on';
        mute.setAttribute('aria-label', audio.muted ? 'Unmute audio' : 'Mute audio');
        mute.setAttribute('aria-pressed', audio.muted ? 'true' : 'false');
    }

    toggle.addEventListener('click', function() {
        if (audio.paused) audio.play().catch(function() {});
        else audio.pause();
    });
    progress.addEventListener('input', function() {
        audio.currentTime = limits().start + Number(progress.value);
        updatePlayer();
    });
    mute.addEventListener('click', function() {
        audio.muted = !audio.muted;
        updatePlayer();
    });
    ['loadedmetadata', 'durationchange', 'timeupdate', 'play', 'pause', 'ended', 'volumechange'].forEach(function(eventName) {
        audio.addEventListener(eventName, updatePlayer);
    });

    audio.SAPlayer = { element: player, update: updatePlayer };
    updatePlayer();
}

function initializeOpeningCallReader(openingTimeline) {
    if (!openingTimeline) return;

    const callDetails = {
        'timeline-initial-call': {
            title: 'Initial 911 call · 6:11 p.m.',
            lines: [
                { speaker: 'dispatcher', text: 'Dispatcher: Toronto ambulance, where do you need us?' },
                { speaker: 'narration', text: 'Laurel gave their west-end address, recounted how her husband got hurt, and notified the dispatcher that her husband was also a cancer patient. He wasn’t bleeding or throwing up, she told them—but he was in pain severe enough that he couldn’t stand up.' },
                { speaker: 'dispatcher', text: 'Dispatcher: Ambulances will be sent as one becomes available. Our goal is to arrive within the hour, but it may take longer. Watch him closely.' }
            ]
        },
        'timeline-call-back-1': {
            title: 'Second 911 call · 7:08 p.m.',
            lines: [
                { speaker: 'dispatcher', text: 'Dispatcher: Toronto ambulance, where do you need us?' },
                { speaker: 'caller', text: 'Caller: Well, I actually called about an hour ago, and I just wondered if there was any sense of when they might come.' },
                { speaker: 'dispatcher', text: 'Dispatcher: Unfortunately, Laurel, there is still a delay. We don’t have any available ambulances just yet, but as soon as we have one available, we’ll be sending it to you.' }
            ]
        },
        'timeline-call-back-2': {
            title: 'Third 911 call · 8:52 p.m.',
            lines: [
                { speaker: 'dispatcher', text: 'Dispatcher: Toronto ambulance, where do you need us?' },
                { speaker: 'caller', text: 'Caller: Well, I already made a call—just after 6:00. My husband fell off his bicycle earlier today and he’s in an extreme amount of pain in his leg. He’s unable to stand up.' },
                { speaker: 'dispatcher', text: 'Dispatcher: Is he awake?' },
                { speaker: 'caller', text: 'Caller: He’s awake, yes.' },
                { speaker: 'dispatcher', text: 'Dispatcher: Is he breathing?' },
                { speaker: 'caller', text: 'Caller: He’s conscious. He’s breathing. He’s awake—' },
                { speaker: 'dispatcher', text: 'Dispatcher: Is he responding normally?' },
                { speaker: 'caller', text: 'Caller: Yes. Yes. Just screaming in pain sometimes.' },
                { speaker: 'dispatcher', text: 'Dispatcher: Okay, I apologize for the delay.' }
            ]
        }
    };
    const calls = {};

    Object.keys(callDetails).forEach(function(audioId) {
        const cards = Array.from(openingTimeline.querySelectorAll(`.SA_opening-timeline__mute[data-audio-id="${audioId}"]`)).map(function(button) {
            return button.closest('.SA_opening-timeline__audio-card');
        }).filter(Boolean);
        if (!cards.length) return;

        const slides = cards.map(function(card) { return card.closest('.SA_scrollytelling-slide'); });
        const transcriptHtml = cards.map(function(card) {
            const transcript = card.querySelector('.SA_opening-timeline__transcript');
            return transcript ? transcript.innerHTML : '';
        }).filter(Boolean);
        const source = openingTimeline.querySelector(`#${audioId} source`);
        calls[audioId] = {
            title: callDetails[audioId].title,
            transcriptHtml: transcriptHtml,
            source: source ? source.getAttribute('src') : ''
        };

        const firstCard = cards[0];
        const firstSlide = slides[0];
        const blurb = document.createElement('div');
        blurb.className = 'SA_opening-timeline__call-excerpt';
        callDetails[audioId].lines.forEach(function(exchange) {
            const line = document.createElement('p');
            line.className = `SA_opening-timeline__call-blurb SA_opening-timeline__speaker--${exchange.speaker}`;
            line.textContent = exchange.text;
            blurb.appendChild(line);
        });
        const openButton = document.createElement('button');
        openButton.className = 'SA_opening-timeline__call-reader-open';
        openButton.type = 'button';
        openButton.dataset.callReader = audioId;
        openButton.textContent = 'Listen and read the full call';
        firstCard.replaceChildren(blurb, openButton);
        firstSlide.removeAttribute('data-on-enter');
        firstSlide.removeAttribute('data-on-exit');
        slides.slice(1).forEach(function(slide) { slide.remove(); });
    });

    if (!Object.keys(calls).length) return;
    const dialog = document.createElement('div');
    dialog.className = 'SA_opening-timeline__call-reader';
    dialog.hidden = true;
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', 'SA-call-reader-title');
    dialog.innerHTML = '<div class="SA_opening-timeline__call-reader-panel"><button class="SA_opening-timeline__call-reader-close" type="button" aria-label="Close full call">Close</button><h2 id="SA-call-reader-title"></h2><audio class="SA_opening-timeline__call-reader-audio" controls preload="metadata"></audio><div class="SA_opening-timeline__call-reader-transcript"></div></div>';
    document.body.appendChild(dialog);

    const title = dialog.querySelector('#SA-call-reader-title');
    const audio = dialog.querySelector('audio');
    const transcript = dialog.querySelector('.SA_opening-timeline__call-reader-transcript');
    const closeButton = dialog.querySelector('.SA_opening-timeline__call-reader-close');
    let returnFocus = null;

    function callReaderLines(htmlChunks) {
        const lines = [];
        htmlChunks.forEach(function(html) {
            const staging = document.createElement('div');
            staging.innerHTML = html;
            let line = null;
            Array.from(staging.childNodes).forEach(function(node) {
                if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'STRONG') {
                    const speaker = node.textContent.toLowerCase().includes('dispatcher') ? 'dispatcher' : 'caller';
                    line = document.createElement('p');
                    line.className = `SA_opening-timeline__call-reader-line SA_opening-timeline__speaker--${speaker}`;
                    node.classList.add(`SA_opening-timeline__speaker--${speaker}`);
                    line.appendChild(node);
                    lines.push(line);
                } else {
                    if (!line && node.textContent.trim()) {
                        line = document.createElement('p');
                        line.className = 'SA_opening-timeline__call-reader-line';
                        lines.push(line);
                    }
                    if (line) line.appendChild(node);
                }
            });
        });
        return lines;
    }

    function closeReader() {
        if (dialog.hidden) return;
        audio.pause();
        dialog.hidden = true;
        document.body.classList.remove('SA_call-reader-open');
        if (returnFocus) returnFocus.focus();
    }

    openingTimeline.querySelectorAll('[data-call-reader]').forEach(function(button) {
        button.addEventListener('click', function() {
            const call = calls[button.dataset.callReader];
            if (!call) return;
            stopOpeningTimelineAudio();
            returnFocus = button;
            title.textContent = call.title;
            audio.src = call.source;
            transcript.replaceChildren(...callReaderLines(call.transcriptHtml));
            dialog.hidden = false;
            document.body.classList.add('SA_call-reader-open');
            closeButton.focus();
        });
    });

    closeButton.addEventListener('click', closeReader);
    dialog.addEventListener('click', function(event) {
        if (event.target === dialog) closeReader();
    });
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') closeReader();
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
        initializeOpeningAudioPlayer(audio);
        audio.addEventListener('timeupdate', function() {
            updateTimelineTranscript(audio);
            if (audio.dataset.segmentEnd && audio.currentTime >= Number(audio.dataset.segmentEnd)) audio.pause();
        });
    });

    document.querySelectorAll('.SA_opening-timeline__audio-trigger').forEach(function(button) {
        button.addEventListener('click', function() {
            const audio = document.getElementById(button.dataset.audioId);
            if (!audio) return;

            document.querySelectorAll('.SA_opening-timeline audio').forEach(function(otherAudio) {
                if (otherAudio !== audio) otherAudio.pause();
            });

            audio.dataset.segmentStart = button.dataset.audioStart || '0';
            audio.dataset.segmentEnd = button.dataset.audioEnd || '';
            audio.currentTime = Number(audio.dataset.segmentStart);
            if (audio.SAPlayer) {
                audio.SAPlayer.element.hidden = false;
                audio.SAPlayer.update();
            }
            const note = button.parentNode.querySelector('.SA_opening-timeline__audio-note');
            if (note) note.hidden = false;
            button.hidden = true;

            const playAttempt = audio.play();
            if (playAttempt && typeof playAttempt.catch === 'function') playAttempt.catch(function() {});
        });
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

// Long-form Toronto EMS response-time beeswarm

function initializeEmsBeeswarmLegacy() {
    const chart = document.querySelector('[data-ems-beeswarm]');
    if (!chart) return;

    const canvas = chart.querySelector('[data-ems-beeswarm-canvas]');
    const loading = chart.querySelector('[data-ems-beeswarm-loading]');
    const annotations = Array.from(chart.querySelectorAll('[data-call-id]'));
    const context = canvas.getContext('2d');
    const maxSeconds = 8 * 60 * 60;
    const chartHeight = 7200;
    const priorityOrder = ['0-PURPLE', '1-RED (COMBINED)', '3-ORANGE', '4-YELLOW'];
    const colourProperties = ['--bees-purple', '--bees-red', '--bees-orange', '--bees-yellow'];
    const styles = getComputedStyle(chart.closest('.SA_ems-beeswarm'));
    const colours = Object.fromEntries(priorityOrder.map(function(priority, index) {
        return [priority, styles.getPropertyValue(colourProperties[index]).trim()];
    }));
    let calls = [];
    let resizeTimer;

    function hashNumber(value) {
        let hash = 2166136261;
        const stringValue = String(value);
        for (let index = 0; index < stringValue.length; index += 1) {
            hash ^= stringValue.charCodeAt(index);
            hash = Math.imul(hash, 16777619);
        }
        return hash >>> 0;
    }

    function formatDuration(seconds) {
        const totalMinutes = Math.round(seconds / 60);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        if (!hours) return `${minutes} min`;
        return minutes ? `${hours} hr ${minutes} min` : `${hours} hr`;
    }

    function parseCalls(csv) {
        return csv.trim().split(/\r?\n/).slice(1).map(function(line) {
            const values = line.split(',');
            return {
                id: values[0],
                type: values[1],
                priority: values[2],
                seconds: Number(values[3])
            };
        }).filter(function(call) {
            return colours[call.priority] && Number.isFinite(call.seconds);
        });
    }

    function draw() {
        const width = Math.max(320, Math.round(chart.getBoundingClientRect().width));
        const left = width < 600 ? 42 : 72;
        const right = width - (width < 600 ? 20 : 42);
        const top = 54;
        const bottom = chartHeight - 54;
        const plotHeight = bottom - top;
        const laneWidth = (right - left) / priorityOrder.length;
        const rows = calls.filter(function(call) { return call.seconds <= maxSeconds; });
        const frequency = new Map();
        const seen = new Map();
        const positions = new Map();

        canvas.width = width;
        canvas.height = chartHeight;
        context.clearRect(0, 0, width, chartHeight);
        context.fillStyle = styles.getPropertyValue('--bees-background').trim() || '#000';
        context.fillRect(0, 0, width, chartHeight);

        context.font = '700 10px "JetBrains Mono", monospace';
        context.textBaseline = 'middle';
        context.lineWidth = 1;
        priorityOrder.forEach(function(priority, index) {
            const centre = left + laneWidth * (index + 0.5);
            context.strokeStyle = 'rgba(255,255,255,0.06)';
            context.beginPath();
            context.moveTo(centre, top);
            context.lineTo(centre, bottom);
            context.stroke();
            context.fillStyle = colours[priority];
            context.textAlign = 'center';
            context.fillText(priority.replace(/^\d-/, '').replace(' (', '\n('), centre, 20);
        });

        for (let seconds = 0; seconds <= maxSeconds; seconds += 1800) {
            const y = top + (seconds / maxSeconds) * plotHeight;
            context.strokeStyle = seconds % 3600 === 0 ? 'rgba(255,255,255,0.24)' : 'rgba(255,255,255,0.1)';
            context.beginPath();
            context.moveTo(left, y);
            context.lineTo(right, y);
            context.stroke();
            context.fillStyle = 'rgba(255,255,255,0.72)';
            context.textAlign = 'right';
            context.fillText(formatDuration(seconds), left - 7, y);
        }

        rows.forEach(function(call) {
            const key = `${call.priority}|${Math.round(call.seconds)}`;
            frequency.set(key, (frequency.get(key) || 0) + 1);
        });

        rows.forEach(function(call) {
            const priorityIndex = priorityOrder.indexOf(call.priority);
            const key = `${call.priority}|${Math.round(call.seconds)}`;
            const rank = seen.get(key) || 0;
            const count = frequency.get(key) || 1;
            const centre = left + laneWidth * (priorityIndex + 0.5);
            const direction = rank % 2 ? 1 : -1;
            const step = Math.ceil(rank / 2) * 1.25;
            const spread = Math.min(laneWidth * 0.43, Math.max(1, count * 0.7));
            const randomOffset = ((hashNumber(call.id) % 1000) / 1000 - 0.5) * Math.min(3, spread);
            const x = centre + Math.max(-spread, Math.min(spread, direction * step + randomOffset));
            const baseY = top + (call.seconds / maxSeconds) * plotHeight;
            const y = baseY + ((hashNumber(`${call.id}-y`) % 7) - 3) * 0.45;
            seen.set(key, rank + 1);

            context.globalAlpha = 0.42;
            context.fillStyle = colours[call.priority];
            context.beginPath();
            context.arc(x, y, width < 600 ? 1.05 : 1.3, 0, Math.PI * 2);
            context.fill();
            if (annotations.some(function(annotation) { return annotation.dataset.callId === call.id; })) {
                positions.set(call.id, { x: x, y: y, colour: colours[call.priority] });
            }
        });
        context.globalAlpha = 1;

        annotations.forEach(function(annotation, index) {
            const point = positions.get(annotation.dataset.callId);
            if (!point) return;
            annotation.dataset.side = index % 2 ? 'right' : 'left';
            annotation.style.top = `${Math.max(8, point.y - 18)}px`;
            annotation.style.setProperty('--annotation-colour', point.colour);

            context.fillStyle = point.colour;
            context.strokeStyle = '#fff';
            context.lineWidth = 2;
            context.beginPath();
            context.arc(point.x, point.y, 7, 0, Math.PI * 2);
            context.fill();
            context.stroke();

            window.requestAnimationFrame(function() {
                const chartBox = chart.getBoundingClientRect();
                const cardBox = annotation.getBoundingClientRect();
                const cardEdge = annotation.dataset.side === 'left'
                    ? cardBox.right - chartBox.left
                    : chartBox.right - cardBox.left;
                const lineLength = annotation.dataset.side === 'left'
                    ? Math.max(16, point.x - cardEdge)
                    : Math.max(16, cardEdge - point.x);
                annotation.style.setProperty('--annotation-line', `${lineLength}px`);
            });
        });

        loading.hidden = true;
    }

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            entry.target.classList.toggle('SA_ems-beeswarm__annotation--active', entry.isIntersecting);
        });
    }, { rootMargin: '-25% 0px -25% 0px', threshold: 0.15 });
    annotations.forEach(function(annotation) { observer.observe(annotation); });

    fetch('images/data/priority_response_beeswarm.csv')
        .then(function(response) {
            if (!response.ok) throw new Error(`Unable to load beeswarm data (${response.status})`);
            return response.text();
        })
        .then(function(csv) {
            calls = parseCalls(csv);
            draw();
        })
        .catch(function(error) {
            loading.textContent = 'The ambulance response-time graphic could not be loaded.';
            console.error(error);
        });

    window.addEventListener('resize', function() {
        window.clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(function() {
            if (calls.length) draw();
        }, 180);
    });
}

function initializeEmsBeeswarm() {
    const scrolly = document.querySelector('[data-ems-beeswarm]');
    if (!scrolly) return;

    const graphic = scrolly.querySelector('.SA_ems-beeswarm__graphic');
    const canvas = scrolly.querySelector('[data-ems-beeswarm-canvas]');
    const svg = scrolly.querySelector('[data-ems-beeswarm-svg]');
    const loading = scrolly.querySelector('[data-ems-beeswarm-loading]');
    const steps = Array.from(scrolly.querySelectorAll('.SA_ems-beeswarm__step'));
    const context = canvas.getContext('2d');
    const priorityOrder = ['0-PURPLE', '1-RED (COMBINED)', '3-ORANGE', '4-YELLOW'];
    const responseTargets = [360, 539, 1500, 2700];
    const meanArrivals = [537, 752, 1598, 2516];
    const p90Arrivals = [831, 1111, 2813, 5243];
    const colourProperties = ['--bees-purple', '--bees-red', '--bees-orange', '--bees-yellow'];
    const chartStyles = getComputedStyle(scrolly.closest('.SA_ems-beeswarm'));
    const colours = Object.fromEntries(priorityOrder.map(function(priority, index) {
        return [priority, chartStyles.getPropertyValue(colourProperties[index]).trim()];
    }));
    let calls = [];
    let groupsByKey = new Map();
    let frameRequested = false;
    let swarmLayer = document.createElement('canvas');
    let swarmLayerWidth = 0;
    const swarmLayerHeight = 7200;
    let logarithmicLayer = document.createElement('canvas');
    let logarithmicLayerWidth = 0;
    let logarithmicLayerHeight = 0;
    const maximumResponseSeconds = 8 * 3600;
    const logarithmicConstant = 300;
    const logarithmicStretch = 2;

    function logarithmicProgress(seconds) {
        return Math.log1p(Math.max(0, seconds) / logarithmicConstant) / Math.log1p(maximumResponseSeconds / logarithmicConstant);
    }

    function logarithmicSeconds(progress) {
        return logarithmicConstant * (Math.exp(progress * Math.log1p(maximumResponseSeconds / logarithmicConstant)) - 1);
    }

    function hashNumber(value) {
        let hash = 2166136261;
        String(value).split('').forEach(function(character) {
            hash ^= character.charCodeAt(0);
            hash = Math.imul(hash, 16777619);
        });
        return hash >>> 0;
    }

    function parseCalls(csv) {
        return csv.trim().split(/\r?\n/).slice(1).map(function(line) {
            const values = line.split(',');
            return { priority: values[0], seconds: Number(values[1]), count: Number(values[2]) };
        }).filter(function(call) {
            return colours[call.priority] && Number.isFinite(call.seconds) && call.count > 0;
        });
    }

    function dotPosition(priority, seconds, count, rank) {
        const direction = rank % 2 ? 1 : -1;
        const step = Math.ceil(rank / 2) * 0.018;
        const spread = Math.min(0.43, Math.max(0.02, count * 0.012));
        const token = `${priority}-${seconds}-${rank}`;
        const jitter = ((hashNumber(token) % 1000) / 1000 - 0.5) * Math.min(0.035, spread);
        return {
            laneOffset: Math.max(-spread, Math.min(spread, direction * step + jitter)),
            yJitter: ((hashNumber(`${token}-y`) % 7) - 3) * 0.28
        };
    }

    function lowerBound(seconds) {
        let low = 0;
        let high = calls.length;
        while (low < high) {
            const middle = (low + high) >> 1;
            if (calls[middle].seconds < seconds) low = middle + 1;
            else high = middle;
        }
        return low;
    }

    function formatDuration(seconds) {
        const minutes = Math.round(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const remainder = minutes % 60;
        return hours ? (remainder ? `${hours} hr ${remainder} min` : `${hours} hr`) : `${minutes} min`;
    }

    function buildSwarmLayer(width, left, right) {
        if (swarmLayerWidth === width) return;
        swarmLayerWidth = width;
        swarmLayer.width = width;
        swarmLayer.height = swarmLayerHeight;
        const layerContext = swarmLayer.getContext('2d');
        const laneWidth = (right - left) / priorityOrder.length;
        layerContext.clearRect(0, 0, width, swarmLayerHeight);
        layerContext.globalAlpha = 0.45;
        calls.forEach(function(call) {
            if (call.seconds < 0 || call.seconds > 8 * 3600) return;
            const priorityIndex = priorityOrder.indexOf(call.priority);
            const centre = left + laneWidth * (priorityIndex + 0.5);
            layerContext.fillStyle = colours[call.priority];
            for (let rank = 0; rank < call.count; rank += 1) {
                const position = dotPosition(call.priority, call.seconds, call.count, rank);
                const x = centre + position.laneOffset * laneWidth;
                const y = (call.seconds / (8 * 3600)) * swarmLayerHeight + position.yJitter;
                layerContext.beginPath();
                layerContext.arc(x, y, width < 600 ? 1.1 : 1.35, 0, Math.PI * 2);
                layerContext.fill();
            }
        });
        layerContext.globalAlpha = 1;
    }

    function buildLogarithmicLayer(width, height, left, right, top, bottom) {
        const layerHeight = Math.ceil(top + (bottom - top) * logarithmicStretch);
        if (logarithmicLayerWidth === width && logarithmicLayerHeight === layerHeight) return;
        logarithmicLayerWidth = width;
        logarithmicLayerHeight = layerHeight;
        logarithmicLayer.width = width;
        logarithmicLayer.height = layerHeight;
        const layerContext = logarithmicLayer.getContext('2d');
        const laneWidth = (right - left) / priorityOrder.length;
        const dotSize = width < 600 ? 1.15 : 1.4;
        layerContext.clearRect(0, 0, width, layerHeight);
        layerContext.globalAlpha = 0.42;
        calls.forEach(function(call) {
            if (call.seconds < 0 || call.seconds > maximumResponseSeconds) return;
            const priorityIndex = priorityOrder.indexOf(call.priority);
            const centre = left + laneWidth * (priorityIndex + 0.5);
            const baseY = top + logarithmicProgress(call.seconds) * (bottom - top) * logarithmicStretch;
            layerContext.fillStyle = colours[call.priority];
            for (let rank = 0; rank < call.count; rank += 1) {
                const position = dotPosition(call.priority, call.seconds, call.count, rank);
                const x = centre + position.laneOffset * laneWidth;
                const y = baseY + position.yJitter;
                layerContext.fillRect(x - dotSize / 2, y - dotSize / 2, dotSize, dotSize);
            }
        });
        layerContext.globalAlpha = 1;
    }

    function drawMorphedLogarithmicLayer(width, top, bottom, linearScale, amount) {
        const plotHeight = bottom - top;
        const sourceBottom = top + plotHeight * logarithmicStretch;
        const stripHeight = 4;
        for (let sourceY = 0; sourceY < sourceBottom; sourceY += stripHeight) {
            const sourceEnd = Math.min(sourceBottom, sourceY + stripHeight);
            const startProgress = Math.max(0, (sourceY - top) / (plotHeight * logarithmicStretch));
            const endProgress = Math.max(0, (sourceEnd - top) / (plotHeight * logarithmicStretch));
            const startSeconds = logarithmicSeconds(startProgress);
            const endSeconds = logarithmicSeconds(endProgress);
            const destinationY = sourceY + (linearScale(startSeconds) - sourceY) * amount;
            const destinationEnd = sourceEnd + (linearScale(endSeconds) - sourceEnd) * amount;
            if (destinationEnd < top || destinationY > bottom) continue;
            context.drawImage(logarithmicLayer, 0, sourceY, width, sourceEnd - sourceY, 0, destinationY, width, Math.max(1, destinationEnd - destinationY + 0.5));
        }
    }

    function activeState() {
        const viewportMiddle = window.innerHeight / 2;
        const centres = steps.map(function(step) {
            const box = step.getBoundingClientRect();
            return box.top + box.height / 2;
        });
        let activeIndex = 0;
        let closestDistance = Infinity;
        centres.forEach(function(centre, index) {
            const distance = Math.abs(centre - viewportMiddle);
            if (distance < closestDistance) {
                closestDistance = distance;
                activeIndex = index;
            }
        });
        let from = activeIndex;
        let to = activeIndex;
        let amount = 0;
        if (centres[activeIndex] < viewportMiddle && activeIndex < steps.length - 1) {
            to = activeIndex + 1;
            amount = (viewportMiddle - centres[activeIndex]) / (centres[to] - centres[activeIndex]);
        } else if (centres[activeIndex] > viewportMiddle && activeIndex > 0) {
            from = activeIndex - 1;
            to = activeIndex;
            amount = (viewportMiddle - centres[from]) / (centres[to] - centres[from]);
        }
        const startSeconds = Number(steps[from].dataset.seconds);
        const endSeconds = Number(steps[to].dataset.seconds);
        const startMode = steps[from].dataset.mode;
        const endMode = steps[to].dataset.mode;
        const linearModes = ['linear', 'p90-actual', 'extreme'];
        const startLinear = !startMode || linearModes.includes(startMode) ? 1 : 0;
        const endLinear = !endMode || linearModes.includes(endMode) ? 1 : 0;
        const boundedAmount = Math.max(0, Math.min(1, amount));
        const referenceProgress = startMode === 'p90-actual'
            ? 1
            : endMode === 'p90-actual'
                ? boundedAmount * boundedAmount * (3 - 2 * boundedAmount)
                : 0;
        return {
            step: steps[activeIndex],
            centreSeconds: startSeconds + (endSeconds - startSeconds) * boundedAmount,
            linearAmount: startLinear + (endLinear - startLinear) * boundedAmount,
            referenceProgress: referenceProgress
        };
    }

    function svgElement(name, attributes) {
        const element = document.createElementNS('http://www.w3.org/2000/svg', name);
        Object.keys(attributes || {}).forEach(function(key) { element.setAttribute(key, attributes[key]); });
        return element;
    }

    function wrappedTextLines(text, width, className) {
        const words = text.split(/\s+/);
        const characterWidth = className.includes('title--intro') ? 10
            : className.includes('copy--intro') ? 7.8
            : className.includes('__title') ? 7.4
            : className.includes('__copy') ? 6.6
            : 6.2;
        const charactersPerLine = Math.max(14, Math.floor(width / characterWidth));
        const lines = [];
        let line = '';
        words.forEach(function(word) {
            const candidate = line ? `${line} ${word}` : word;
            if (candidate.length > charactersPerLine && line) {
                lines.push(line);
                line = word;
            } else {
                line = candidate;
            }
        });
        if (line) lines.push(line);
        return lines;
    }

    function addWrappedText(group, text, x, y, width, className, lineHeight) {
        const node = svgElement('text', { x: x, y: y, class: className });
        const lines = wrappedTextLines(text, width, className);
        lines.forEach(function(line, index) {
            const span = svgElement('tspan', { x: x, dy: index ? lineHeight : 0 });
            span.textContent = line;
            node.appendChild(span);
        });
        group.appendChild(node);
        return lines.length * lineHeight;
    }

    function drawSvgAnnotation(step, point, width, height, colour, preserveExisting) {
        if (!preserveExisting) svg.replaceChildren();
        svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        svg.setAttribute('aria-label', `${step.dataset.time}. ${step.dataset.title}. ${step.dataset.copy}`);
        const mobile = width < 600;
        const boxWidth = Math.min(mobile ? width - 32 : 360, width * (mobile ? 0.92 : 0.4));
        const boxX = mobile ? 16 : (point.x > width / 2 ? 24 : width - boxWidth - 24);
        const group = svgElement('g', { class: 'SA_bees-annotation' });
        const textWidth = boxWidth - 32;
        const titleHeight = wrappedTextLines(step.dataset.title, textWidth, 'SA_bees-annotation__title').length * 18;
        const copyHeight = wrappedTextLines(step.dataset.copy, textWidth, 'SA_bees-annotation__copy').length * 16;
        const boxHeight = Math.max(205, 81 + titleHeight + copyHeight);
        const boxY = Math.max(105, Math.min(height - boxHeight - 24, point.y - boxHeight / 2));
        const targetX = point.x;
        const targetY = point.y;
        const edgeX = boxX < targetX ? boxX + boxWidth : boxX;
        const bendX = boxX < targetX ? edgeX + 30 : edgeX - 30;
        const path = svgElement('path', {
            d: `M ${targetX} ${targetY} C ${bendX} ${targetY}, ${bendX} ${boxY + 26}, ${edgeX} ${boxY + 26}`,
            class: 'SA_bees-annotation__connector',
            stroke: colour
        });
        group.appendChild(path);
        group.appendChild(svgElement('circle', { cx: targetX, cy: targetY, r: 8, class: 'SA_bees-annotation__target', stroke: colour }));
        group.appendChild(svgElement('rect', { x: boxX, y: boxY, width: boxWidth, height: boxHeight, rx: 3, class: 'SA_bees-annotation__box' }));
        group.appendChild(svgElement('line', { x1: boxX, y1: boxY, x2: boxX + boxWidth, y2: boxY, class: 'SA_bees-annotation__rule', stroke: colour }));
        const textX = boxX + 16;
        addWrappedText(group, step.dataset.time, textX, boxY + 25, textWidth, 'SA_bees-annotation__time', 14);
        addWrappedText(group, step.dataset.title, textX, boxY + 53, textWidth, 'SA_bees-annotation__title', 18);
        addWrappedText(group, step.dataset.copy, textX, boxY + 65 + titleHeight, textWidth, 'SA_bees-annotation__copy', 16);
        svg.appendChild(group);
    }

    function drawIntroPanel(group, step, width, height) {
        const edgePadding = width < 600 ? 24 : 40;
        const boxWidth = Math.min(width - edgePadding * 2, 500);
        const textWidth = boxWidth - 36;
        const titleClass = 'SA_bees-annotation__title SA_bees-annotation__title--intro';
        const copyClass = 'SA_bees-annotation__copy SA_bees-annotation__copy--intro';
        const titleHeight = wrappedTextLines(step.dataset.title, textWidth, titleClass).length * 21;
        const copyHeight = wrappedTextLines(step.dataset.copy, textWidth, copyClass).length * 18;
        const boxHeight = 82 + titleHeight + copyHeight;
        const requestedPosition = step.dataset.panelPosition === 'high'
            ? 'top-center'
            : (step.dataset.panelPosition || 'bottom-center');
        const positionParts = requestedPosition.split('-');
        const verticalPosition = positionParts[0];
        const horizontalPosition = positionParts[1] || 'center';
        const topPadding = width < 600 ? 86 : 94;
        const maximumBoxY = Math.max(topPadding, height - boxHeight - edgePadding);
        const boxX = horizontalPosition === 'left'
            ? edgePadding
            : horizontalPosition === 'right'
                ? width - boxWidth - edgePadding
                : (width - boxWidth) / 2;
        const boxY = verticalPosition === 'top'
            ? topPadding
            : verticalPosition === 'center'
                ? Math.max(topPadding, Math.min(maximumBoxY, (height - boxHeight) / 2))
                : maximumBoxY;
        const textX = boxX + 18;
        group.appendChild(svgElement('rect', { x: boxX, y: boxY, width: boxWidth, height: boxHeight, rx: 3, class: 'SA_bees-annotation__box' }));
        addWrappedText(group, step.dataset.title, textX, boxY + 34, textWidth, titleClass, 21);
        addWrappedText(group, step.dataset.copy, textX, boxY + 48 + titleHeight, textWidth, 'SA_bees-annotation__copy SA_bees-annotation__copy--intro', 18);
    }

    function drawReferenceOverlay(step, width, height, left, laneWidth, yScale, includePanel, referenceProgress) {
        svg.replaceChildren();
        svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        svg.setAttribute('aria-label', `${step.dataset.title}. ${step.dataset.copy}`);
        const mode = step.dataset.mode;
        const isExtreme = mode === 'extreme';
        const group = svgElement('g', { class: `SA_bees-annotation${isExtreme ? ' SA_bees-annotation--extreme' : ''}` });
        const targetStages = { 'targets-purple': 1, 'targets-all': 4, means: 4, p90: 4, linear: 4, 'p90-actual': 4 };
        const targetCount = targetStages[mode] || 0;

        if (isExtreme) {
            const y = yScale(Number(step.dataset.seconds));
            group.appendChild(svgElement('line', {
                x1: left,
                y1: y,
                x2: left + laneWidth * priorityOrder.length,
                y2: y,
                class: 'SA_bees-annotation__extreme-line',
                stroke: colours['1-RED (COMBINED)']
            }));
        }

        priorityOrder.forEach(function(priority, index) {
            if (index >= targetCount) return;
            const centre = left + laneWidth * (index + 0.5);
            const x1 = centre - laneWidth * 0.43;
            const x2 = centre + laneWidth * 0.43;
            const y = yScale(responseTargets[index]);
            const label = index === 0 ? 'TARGET PURPLE · 6:00'
                : index === 1 ? 'TARGET RED · 8:59'
                : index === 2 ? 'TARGET ORANGE · 25:00'
                : 'TARGET YELLOW · 45:00';
            group.appendChild(svgElement('line', { x1: x1, y1: y, x2: x2, y2: y, class: 'SA_bees-reference SA_bees-reference--target', stroke: colours[priority] }));
            const labelY = responseTargets[index] <= meanArrivals[index] ? y - 7 : y + 16;
            const text = svgElement('text', { x: centre, y: labelY, class: 'SA_bees-reference__label', fill: colours[priority] });
            text.textContent = width < 600 ? label.replace(/TARGET (RED|PURPLE|ORANGE|YELLOW)/, 'TARGET') : label;
            group.appendChild(text);
        });

        if (mode === 'means' || mode === 'p90' || mode === 'linear' || mode === 'p90-actual') {
            const progress = Math.max(0, Math.min(1, Number(referenceProgress) || 0));
            priorityOrder.forEach(function(priority, index) {
                const centre = left + laneWidth * (index + 0.5);
                const x1 = centre - laneWidth * 0.43;
                const x2 = centre + laneWidth * 0.43;
                const displayedArrival = meanArrivals[index] + (p90Arrivals[index] - meanArrivals[index]) * progress;
                const y = yScale(displayedArrival);
                const labelY = displayedArrival <= responseTargets[index] ? y - 7 : y + 16;
                const text = svgElement('text', { x: centre, y: labelY, class: 'SA_bees-reference__label SA_bees-reference__label--mean', fill: colours[priority] });
                if (progress > 0) {
                    const meanY = yScale(meanArrivals[index]);
                    group.appendChild(svgElement('line', { x1: x1, y1: meanY, x2: x2, y2: meanY, class: 'SA_bees-reference SA_bees-reference--mean-origin' }));
                }
                group.appendChild(svgElement('line', { x1: x1, y1: y, x2: x2, y2: y, class: 'SA_bees-reference SA_bees-reference--mean', stroke: colours[priority] }));
                text.textContent = progress > 0.5
                    ? `P90 · ${formatDuration(p90Arrivals[index])}`
                    : `AVERAGE · ${formatDuration(meanArrivals[index])}`;
                group.appendChild(text);
            });
        }

        if (includePanel !== false) drawIntroPanel(group, step, width, height);
        svg.appendChild(group);
    }

    function draw() {
        if (!calls.length) return;
        const state = activeState();
        const width = Math.max(320, Math.round(graphic.clientWidth));
        const height = Math.max(512, Math.round(graphic.clientHeight));
        const left = width < 600 ? 42 : 72;
        const right = width - (width < 600 ? 14 : 36);
        const top = 82;
        const bottom = height - 28;
        const laneWidth = (right - left) / priorityOrder.length;
        const visibleSpan = width < 600 ? 7200 : 5400;
        const minSeconds = Math.max(0, Math.min(8 * 3600 - visibleSpan, state.centreSeconds - visibleSpan / 2));
        const maxSeconds = minSeconds + visibleSpan;
        const linearScale = function(seconds) { return top + ((seconds - minSeconds) / visibleSpan) * (bottom - top); };
        const logScale = function(seconds) { return top + logarithmicProgress(seconds) * (bottom - top) * logarithmicStretch; };
        const morphAmount = state.linearAmount * state.linearAmount * (3 - 2 * state.linearAmount);
        const yScale = function(seconds) {
            return logScale(seconds) + (linearScale(seconds) - logScale(seconds)) * morphAmount;
        };

        buildSwarmLayer(width, left, right);
        buildLogarithmicLayer(width, height, left, right, top, bottom);
        if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
        }
        context.fillStyle = chartStyles.getPropertyValue('--bees-background').trim() || '#000';
        context.fillRect(0, 0, width, height);
        context.font = '700 9px "JetBrains Mono", monospace';
        context.textBaseline = 'middle';
        context.lineWidth = 1;

        priorityOrder.forEach(function(priority, index) {
            const centre = left + laneWidth * (index + 0.5);
            context.strokeStyle = 'rgba(255,255,255,0.06)';
            context.beginPath();
            context.moveTo(centre, top);
            context.lineTo(centre, bottom);
            context.stroke();
            context.fillStyle = colours[priority];
            context.textAlign = 'center';
            context.fillText(priority.replace(/^\d-/, '').replace(/ \(.+/, ''), centre, 62);
        });

        const sourceY = (minSeconds / maximumResponseSeconds) * swarmLayerHeight;
        const sourceHeight = (visibleSpan / maximumResponseSeconds) * swarmLayerHeight;
        if (morphAmount < 1) {
            drawMorphedLogarithmicLayer(width, top, bottom, linearScale, morphAmount);
        } else {
            context.drawImage(swarmLayer, 0, sourceY, width, sourceHeight, 0, top, width, bottom - top);
        }

        const logarithmicTicks = [0, 900, 1800, 2700, 3600, 5400, 7200, 14400, maximumResponseSeconds];
        const linearTickStart = Math.ceil(minSeconds / 900) * 900;
        const linearTicks = [];
        for (let seconds = linearTickStart; seconds <= maxSeconds; seconds += 900) linearTicks.push(seconds);
        const tickValues = state.linearAmount < 0.5 ? logarithmicTicks : linearTicks;
        tickValues.forEach(function(seconds) {
            const y = yScale(seconds);
            if (y < top || y > bottom) return;
            const isHour = seconds % 3600 === 0;
            context.strokeStyle = chartStyles.getPropertyValue(isHour ? '--bees-hour-time-line' : '--bees-minor-time-line').trim()
                || (isHour ? 'rgba(255,255,255,0.52)' : 'rgba(255,255,255,0.1)');
            context.lineWidth = isHour ? 2 : 1;
            context.beginPath();
            context.moveTo(left, y);
            context.lineTo(right, y);
            context.stroke();
            context.fillStyle = 'rgba(255,255,255,0.72)';
            context.textAlign = 'right';
            context.fillText(formatDuration(seconds), left - 6, y);
        });

        if (state.step.dataset.mode) {
            drawReferenceOverlay(state.step, width, height, left, laneWidth, yScale, state.step.dataset.hidePanel !== 'true', state.referenceProgress);
        } else {
            const targetPriority = state.step.dataset.priority;
            const targetSeconds = Number(state.step.dataset.seconds);
            const targetGroup = groupsByKey.get(`${targetPriority}|${targetSeconds}`);
            if (!targetGroup) return;
            drawReferenceOverlay({
                dataset: {
                    mode: 'p90',
                    title: '',
                    copy: ''
                }
            }, width, height, left, laneWidth, yScale, false, 1);
            const priorityIndex = priorityOrder.indexOf(targetPriority);
            const targetRank = hashNumber(state.step.dataset.callId) % targetGroup.count;
            const targetPosition = dotPosition(targetPriority, targetSeconds, targetGroup.count, targetRank);
            const point = {
                x: left + laneWidth * (priorityIndex + 0.5) + targetPosition.laneOffset * laneWidth,
                y: yScale(targetSeconds) + targetPosition.yJitter
            };
            drawSvgAnnotation(state.step, point, width, height, colours[targetPriority], true);
        }
        loading.hidden = true;
    }

    function requestDraw() {
        if (frameRequested) return;
        frameRequested = true;
        window.requestAnimationFrame(function() {
            draw();
            frameRequested = false;
        });
    }

    fetch('images/data/priority_response_beeswarm_by_priority_time_combinedRed.csv')
        .then(function(response) {
            if (!response.ok) throw new Error(`Unable to load beeswarm data (${response.status})`);
            return response.text();
        })
        .then(function(csv) {
            calls = parseCalls(csv);
            groupsByKey = new Map(calls.map(function(call) { return [`${call.priority}|${call.seconds}`, call]; }));
            swarmLayerWidth = 0;
            logarithmicLayerWidth = 0;
            draw();
        })
        .catch(function(error) {
            loading.textContent = 'The ambulance response-time graphic could not be loaded.';
            console.error(error);
        });

    window.addEventListener('scroll', requestDraw, { passive: true });
    window.addEventListener('resize', requestDraw);
}

document.addEventListener('DOMContentLoaded', initializeEmsBeeswarm);

// Supporting EMS data graphics

function initializeEmsDataCharts() {
    const figures = Array.from(document.querySelectorAll('[data-ems-chart]'));
    if (!figures.length) return;

    const files = {
        targets: 'images/data/slow_response_by_priority_combinedRed.csv',
        emergencies: 'images/data/response_time_by_problem_and_priority_combinedRed.csv',
        escalation: 'images/data/priority_escalation_summary.csv',
        trends: 'images/data/response_time_trend_by_priority_combinedRed.csv',
        availability: 'images/data/ambulance_availability.csv',
        hourly: 'images/data/response_time_by_hour.csv',
        staffing: 'images/data/paramedic_hiring_departures.csv',
        hospital: 'images/data/paramedic_shift_time.csv',
        'multi-hour': 'images/data/priority_response_beeswarm_by_priority_time_combinedRed.csv',
        'fall-waits': 'images/data/fall_long_waits.csv'
    };
    const data = {};
    let resizeTimer;

    function parseCsv(csv) {
        const rows = [];
        let row = [];
        let value = '';
        let quoted = false;

        for (let index = 0; index < csv.length; index += 1) {
            const character = csv[index];
            const nextCharacter = csv[index + 1];
            if (character === '"' && quoted && nextCharacter === '"') {
                value += '"';
                index += 1;
            } else if (character === '"') {
                quoted = !quoted;
            } else if (character === ',' && !quoted) {
                row.push(value);
                value = '';
            } else if ((character === '\n' || character === '\r') && !quoted) {
                if (character === '\r' && nextCharacter === '\n') index += 1;
                row.push(value);
                if (row.some(function(cell) { return cell !== ''; })) rows.push(row);
                row = [];
                value = '';
            } else {
                value += character;
            }
        }
        if (value || row.length) {
            row.push(value);
            rows.push(row);
        }

        const headers = rows.shift() || [];
        return rows.map(function(values) {
            return Object.fromEntries(headers.map(function(header, index) {
                return [header, values[index]];
            }));
        });
    }

    function svgNode(name, attributes, textContent) {
        const node = document.createElementNS('http://www.w3.org/2000/svg', name);
        Object.entries(attributes || {}).forEach(function(entry) { node.setAttribute(entry[0], entry[1]); });
        if (textContent !== undefined) node.textContent = textContent;
        return node;
    }

    function addText(svg, x, y, textContent, attributes) {
        const text = svgNode('text', Object.assign({ x: x, y: y }, attributes || {}), textContent);
        svg.appendChild(text);
        return text;
    }

    function chartPalette(figure) {
        const styles = getComputedStyle(figure);
        return {
            priorities: {
                '0-PURPLE': styles.getPropertyValue('--chart-purple').trim(),
                '1-RED (COMBINED)': styles.getPropertyValue('--chart-red').trim(),
                '1-RED (ACP)': styles.getPropertyValue('--chart-red-acp').trim(),
                '2-RED (PCP)': styles.getPropertyValue('--chart-red-pcp').trim(),
                '3-ORANGE': styles.getPropertyValue('--chart-orange').trim(),
                '4-YELLOW': styles.getPropertyValue('--chart-yellow').trim()
            },
            white: styles.getPropertyValue('--chart-white').trim(),
            background: styles.getPropertyValue('--chart-background').trim(),
            muted: styles.getPropertyValue('--chart-muted').trim(),
            grid: styles.getPropertyValue('--chart-grid').trim()
        };
    }

    function createSvg(mount, height) {
        const width = Math.max(320, Math.round(mount.getBoundingClientRect().width));
        const svg = svgNode('svg', { viewBox: `0 0 ${width} ${height}`, 'aria-hidden': 'true' });
        mount.replaceChildren(svg);
        return { svg: svg, width: width, height: height };
    }

    function bindChartTooltip(node, mount, label, guide) {
        const accessibleLabel = Array.isArray(label)
            ? label.map(function(line) { return line.text; }).join('. ')
            : label;
        node.setAttribute('data-chart-tooltip', 'true');
        node.setAttribute('tabindex', '0');
        node.setAttribute('aria-label', accessibleLabel);

        function tooltip() {
            let element = mount.querySelector('.SA_ems-data-chart__tooltip');
            if (!element) {
                element = document.createElement('div');
                element.className = 'SA_ems-data-chart__tooltip';
                element.setAttribute('role', 'tooltip');
                mount.appendChild(element);
            }
            return element;
        }

        function show(clientX, clientY) {
            const element = tooltip();
            const bounds = mount.getBoundingClientRect();
            const x = Math.max(16, Math.min(bounds.width - 16, clientX - bounds.left));
            const y = Math.max(18, clientY - bounds.top);
            if (Array.isArray(label)) {
                element.replaceChildren(...label.map(function(line) {
                    const item = document.createElement('span');
                    item.className = 'SA_ems-data-chart__tooltip-line';
                    item.textContent = line.text;
                    if (line.colour) item.style.color = line.colour;
                    return item;
                }));
            } else {
                element.textContent = label;
            }
            element.classList.add('SA_ems-data-chart__tooltip--visible');
            const gap = 12;
            const edgePadding = 8;
            const tooltipWidth = element.offsetWidth;
            const preferredLeft = x > bounds.width / 2
                ? x - tooltipWidth - gap
                : x + gap;
            const maximumLeft = Math.max(edgePadding, bounds.width - tooltipWidth - edgePadding);
            const clampedLeft = Math.max(edgePadding, Math.min(maximumLeft, preferredLeft));
            element.style.left = `${clampedLeft}px`;
            element.style.top = `${y}px`;
            element.classList.toggle('SA_ems-data-chart__tooltip--left', x > bounds.width / 2);
            element.classList.toggle('SA_ems-data-chart__tooltip--right', x <= bounds.width / 2);
            if (guide) {
                guide.node.setAttribute('x1', guide.x);
                guide.node.setAttribute('x2', guide.x);
                guide.node.setAttribute('opacity', '1');
            }
        }

        function hide() {
            const element = mount.querySelector('.SA_ems-data-chart__tooltip');
            if (element) element.classList.remove('SA_ems-data-chart__tooltip--visible');
            if (guide) guide.node.setAttribute('opacity', '0');
        }

        node.addEventListener('pointerenter', function(event) { show(event.clientX, event.clientY); });
        node.addEventListener('pointermove', function(event) { show(event.clientX, event.clientY); });
        node.addEventListener('pointerleave', hide);
        node.addEventListener('pointerdown', function(event) { show(event.clientX, event.clientY); });
        node.addEventListener('focus', function() {
            const bounds = node.getBoundingClientRect();
            show(bounds.left + bounds.width / 2, bounds.top);
        });
        node.addEventListener('blur', hide);
    }

    function shortPriority(priority) {
        return ({
            '0-PURPLE': 'Purple',
            '1-RED (COMBINED)': 'Red',
            '1-RED (ACP)': 'Red ACP',
            '2-RED (PCP)': 'Red PCP',
            '3-ORANGE': 'Orange',
            '4-YELLOW': 'Yellow'
        })[priority] || priority;
    }

    function renderTargets(figure, rows) {
        const mount = figure.querySelector('[data-chart-mount]');
        const palette = chartPalette(figure);
        const compact = mount.getBoundingClientRect().width < 540;
        const chart = createSvg(mount, compact ? 420 : 390);
        const left = compact ? 88 : 126;
        const right = chart.width - 48;
        const top = 54;
        const rowGap = 62;

        [0, 25, 50, 75, 100].forEach(function(value) {
            const x = left + (right - left) * value / 100;
            chart.svg.appendChild(svgNode('line', { x1: x, x2: x, y1: top - 20, y2: top + rowGap * 4 + 22, stroke: palette.grid, 'stroke-opacity': value === 0 ? 0.45 : 0.18 }));
            addText(chart.svg, x, top - 28, `${value}%`, { fill: palette.muted, 'font-size': 10, 'text-anchor': 'middle' });
        });

        rows.forEach(function(row, index) {
            const y = top + index * rowGap;
            const rate = Number(row['Slow Rate (%)']);
            const barWidth = (right - left) * rate / 100;
            addText(chart.svg, left - 12, y + 5, shortPriority(row['Final Priority']), { fill: palette.white, 'font-size': compact ? 11 : 13, 'font-weight': 800, 'text-anchor': 'end' });
            chart.svg.appendChild(svgNode('rect', { x: left, y: y - 12, width: right - left, height: 24, rx: 2, fill: palette.white, 'fill-opacity': 0.1 }));
            const bar = svgNode('rect', { x: left, y: y - 12, width: barWidth, height: 24, rx: 2, fill: palette.priorities[row['Final Priority']] });
            chart.svg.appendChild(bar);
            bindChartTooltip(bar, mount, `${shortPriority(row['Final Priority'])}: ${rate.toFixed(1)}% missed the ${row['Threshold Applied']} response goal (${Number(row.Slow).toLocaleString()} of ${Number(row.Total).toLocaleString()} calls).`);
            addText(chart.svg, Math.min(right - 2, left + barWidth + 8), y + 5, `${rate.toFixed(1)}%`, { fill: palette.white, 'font-size': 12, 'font-weight': 800, 'text-anchor': left + barWidth + 52 > right ? 'end' : 'start' });

            const unchangedRate = Number(row['Unchanged Slow Rate (%)']);
            const unchangedWidth = (right - left) * unchangedRate / 100;
            const unchangedY = y + 22;
            chart.svg.appendChild(svgNode('line', { x1: left, x2: right, y1: unchangedY, y2: unchangedY, stroke: palette.white, 'stroke-width': 2, 'stroke-opacity': 0.12 }));
            const unchangedLine = svgNode('line', { x1: left, x2: left + unchangedWidth, y1: unchangedY, y2: unchangedY, stroke: palette.priorities[row['Final Priority']], 'stroke-width': 4 });
            chart.svg.appendChild(unchangedLine);
            bindChartTooltip(unchangedLine, mount, `${shortPriority(row['Final Priority'])}, unchanged priority: ${unchangedRate.toFixed(1)}% missed the response goal (${Number(row['Unchanged Slow']).toLocaleString()} of ${Number(row['Unchanged Total']).toLocaleString()} calls).`);
            addText(chart.svg, Math.min(right, left + unchangedWidth + 7), unchangedY + 4, `Unchanged ${unchangedRate.toFixed(1)}%`, { fill: palette.white, 'font-size': 9, 'font-weight': 700, 'text-anchor': left + unchangedWidth + 88 > right ? 'end' : 'start' });
        });
    }

    function renderEmergencies(figure, rows) {
        const selected = ['Choking', 'STEMI-Unstable', 'STROKE - Stable', 'STROKE - Unstable', 'Stroke (CVA)'];
        const labels = { 'STEMI-Unstable': 'Unstable heart attack', 'STROKE - Stable': 'Stable stroke', 'STROKE - Unstable': 'Unstable stroke', 'Stroke (CVA)': 'CVA stroke' };
        const values = selected.map(function(problem) {
            return rows.find(function(row) { return row['Problem (Short)'] === problem && row['Final Priority'] === 'Life threatening'; });
        }).filter(Boolean);
        const mount = figure.querySelector('[data-chart-mount]');
        const palette = chartPalette(figure);
        const compact = mount.getBoundingClientRect().width < 540;
        const chart = createSvg(mount, compact ? 480 : 440);
        const left = compact ? 132 : 190;
        const right = chart.width - 34;
        const top = 72;
        const bottom = chart.height - 48;
        const maximum = 22;

        [0, 5, 10, 15, 20].forEach(function(minutes) {
            const x = left + (right - left) * minutes / maximum;
            chart.svg.appendChild(svgNode('line', { x1: x, x2: x, y1: top - 24, y2: bottom, stroke: palette.grid, 'stroke-opacity': minutes === 0 ? 0.45 : 0.18 }));
            addText(chart.svg, x, bottom + 26, `${minutes} min`, { fill: palette.muted, 'font-size': 10, 'text-anchor': 'middle' });
        });
        addText(chart.svg, right, 24, '90th percentile', { fill: palette.muted, 'font-size': 10, 'text-anchor': 'end' });

        values.forEach(function(row, index) {
            const y = top + index * ((bottom - top) / Math.max(1, values.length - 1));
            const median = Number(row['Median (sec)']) / 60;
            const p90 = Number(row['P90 (sec)']) / 60;
            const medianX = left + (right - left) * median / maximum;
            const p90X = left + (right - left) * Math.min(maximum, p90) / maximum;
            addText(chart.svg, left - 12, y + 4, labels[row['Problem (Short)']] || row['Problem (Short)'], { fill: palette.white, 'font-size': compact ? 10 : 12, 'font-weight': 700, 'text-anchor': 'end' });
            chart.svg.appendChild(svgNode('line', { x1: medianX, x2: p90X, y1: y, y2: y, stroke: palette.white, 'stroke-width': 2, 'stroke-opacity': 0.65 }));
            const medianPoint = svgNode('circle', { cx: medianX, cy: y, r: 6, fill: palette.white });
            const p90Point = svgNode('circle', { cx: p90X, cy: y, r: 8, fill: palette.priorities['1-RED (COMBINED)'], stroke: palette.white, 'stroke-width': 1.5 });
            chart.svg.appendChild(medianPoint);
            chart.svg.appendChild(p90Point);
            const problemLabel = labels[row['Problem (Short)']] || row['Problem (Short)'];
            bindChartTooltip(medianPoint, mount, `${problemLabel}: median response ${median.toFixed(1)} minutes across ${Number(row.Count).toLocaleString()} life-threatening calls.`);
            bindChartTooltip(p90Point, mount, `${problemLabel}: 90th-percentile response ${p90.toFixed(1)} minutes; one in 10 calls took longer.`);
            addText(chart.svg, p90X, y - 12, `${p90.toFixed(1)} min`, { fill: palette.white, 'font-size': 10, 'font-weight': 800, 'text-anchor': p90X > right - 42 ? 'end' : 'middle' });
        });
        chart.svg.appendChild(svgNode('circle', { cx: left, cy: 24, r: 4, fill: palette.white }));
        addText(chart.svg, left + 10, 28, 'Median', { fill: palette.muted, 'font-size': 10 });
    }

    function renderEscalation(figure, rows) {
        const known = rows.filter(function(row) { return row['Priority Direction'] !== 'Unknown'; });
        const total = known.reduce(function(sum, row) { return sum + Number(row.Count); }, 0);
        const mount = figure.querySelector('[data-chart-mount]');
        const palette = chartPalette(figure);
        const chart = createSvg(mount, 230);
        const left = 18;
        const right = chart.width - 18;
        const y = 62;
        const barHeight = 52;
        const colours = { Escalated: palette.priorities['1-RED (COMBINED)'], 'De-escalated': palette.priorities['4-YELLOW'], Unchanged: palette.muted };
        let x = left;

        known.forEach(function(row) {
            const share = Number(row.Count) / total;
            const width = (right - left) * share;
            const segment = svgNode('rect', { x: x, y: y, width: width, height: barHeight, fill: colours[row['Priority Direction']] });
            chart.svg.appendChild(segment);
            bindChartTooltip(segment, mount, `${row['Priority Direction']}: ${(share * 100).toFixed(1)}% of calls with an initial priority available (${Number(row.Count).toLocaleString()} calls).`);
            if (width > 54) addText(chart.svg, x + width / 2, y + 32, `${(share * 100).toFixed(1)}%`, { fill: palette.white, 'font-size': 12, 'font-weight': 800, 'text-anchor': 'middle' });
            x += width;
        });

        known.forEach(function(row, index) {
            const legendX = left + index * ((right - left) / known.length);
            chart.svg.appendChild(svgNode('circle', { cx: legendX + 5, cy: 153, r: 5, fill: colours[row['Priority Direction']] }));
            addText(chart.svg, legendX + 16, 157, row['Priority Direction'], { fill: palette.white, 'font-size': chart.width < 540 ? 9 : 11, 'font-weight': 700 });
            addText(chart.svg, legendX + 16, 177, `${Number(row.Count).toLocaleString()} calls`, { fill: palette.muted, 'font-size': 9 });
        });
    }

    function renderAvailability(figure, rows) {
        const mount = figure.querySelector('[data-chart-mount]');
        const palette = chartPalette(figure);
        const compact = mount.getBoundingClientRect().width < 540;
        const chart = createSvg(mount, figure.classList.contains('SA_ems-data-chart--float') ? 290 : (compact ? 330 : 300));
        const left = compact ? 126 : 230;
        const right = chart.width - 34;
        const top = 55;
        const maximum = 7000;
        const measures = Array.from(new Set(rows.map(function(row) { return row.Measure; })));
        const yearColours = { '2019': palette.muted, '2023': palette.priorities['1-RED (COMBINED)'] };

        [0, 2000, 4000, 6000].forEach(function(value) {
            const x = left + (right - left) * value / maximum;
            chart.svg.appendChild(svgNode('line', { x1: x, x2: x, y1: top - 24, y2: chart.height - 35, stroke: palette.grid, 'stroke-opacity': value ? 0.18 : 0.45 }));
            addText(chart.svg, x, 24, value ? `${value / 1000}k` : '0', { fill: palette.white, 'font-size': 11, 'text-anchor': 'middle' });
        });

        measures.forEach(function(measure, measureIndex) {
            const baseY = top + measureIndex * 112;
            addText(chart.svg, left - 12, baseY + 23, compact && measure.startsWith('Low') ? 'Low availability' : compact && measure.startsWith('No') ? 'None available' : measure, { fill: palette.white, 'font-size': compact ? 10 : 12, 'font-weight': 800, 'text-anchor': 'end' });
            rows.filter(function(row) { return row.Measure === measure; }).forEach(function(row, yearIndex) {
                const y = baseY + yearIndex * 34;
                const width = (right - left) * Number(row.Count) / maximum;
                addText(chart.svg, left - 12, y + 5, row.Year, { fill: palette.white, 'font-size': 10, 'text-anchor': 'end' });
                const bar = svgNode('rect', { x: left, y: y - 10, width: Math.max(2, width), height: 20, fill: yearColours[row.Year], rx: 2 });
                chart.svg.appendChild(bar);
                addText(chart.svg, Math.min(right, left + width + 8), y + 5, Number(row.Count).toLocaleString(), { fill: palette.white, 'font-size': 11, 'font-weight': 800, 'text-anchor': left + width + 48 > right ? 'end' : 'start' });
                bindChartTooltip(bar, mount, `${measure}, ${row.Year}: ${Number(row.Count).toLocaleString()} incidents.`);
            });
        });
    }

    function renderStaffing(figure, rows) {
        const mount = figure.querySelector('[data-chart-mount]');
        const palette = chartPalette(figure);
        const chart = createSvg(mount, figure.classList.contains('SA_ems-data-chart--float') ? 260 : 290);
        const left = 48;
        const right = chart.width - 24;
        const top = 32;
        const bottom = 225;
        const maximum = 180;
        const groupWidth = (right - left) / rows.length;
        const colours = { Hired: palette.priorities['4-YELLOW'], Departed: palette.priorities['1-RED (COMBINED)'] };

        [0, 50, 100, 150].forEach(function(value) {
            const y = bottom - (bottom - top) * value / maximum;
            chart.svg.appendChild(svgNode('line', { x1: left, x2: right, y1: y, y2: y, stroke: palette.grid, 'stroke-opacity': value ? 0.18 : 0.45 }));
            addText(chart.svg, left - 8, y + 4, value, { fill: palette.white, 'font-size': 11, 'text-anchor': 'end' });
        });

        rows.forEach(function(row, groupIndex) {
            const center = left + groupWidth * (groupIndex + 0.5);
            ['Hired', 'Departed'].forEach(function(key, index) {
                const value = Number(row[key]);
                const width = Math.min(54, groupWidth * 0.28);
                const x = center + (index - 1) * (width + 5) + 5;
                const y = bottom - (bottom - top) * value / maximum;
                const bar = svgNode('rect', { x: x, y: y, width: width, height: bottom - y, fill: colours[key], rx: 2 });
                chart.svg.appendChild(bar);
                addText(chart.svg, x + width / 2, y - 9, value, { fill: palette.white, 'font-size': 11, 'font-weight': 800, 'text-anchor': 'middle' });
                bindChartTooltip(bar, mount, `${row.Year}: ${value} paramedics ${key.toLowerCase()}. Net staffing gain: ${Number(row.Net)}.`);
            });
            addText(chart.svg, center, bottom + 26, row.Year, { fill: palette.white, 'font-size': 12, 'font-weight': 800, 'text-anchor': 'middle' });
        });
    }

    function renderHospital(figure, rows) {
        const mount = figure.querySelector('[data-chart-mount]');
        const palette = chartPalette(figure);
        const chart = createSvg(mount, figure.classList.contains('SA_ems-data-chart--float') ? 270 : 310);
        const hospitalShare = Number((rows.find(function(row) { return row.Activity === 'In hospital'; }) || {})['Share (%)']);
        const centreX = chart.width / 2;
        const centreY = chart.height / 2;
        const radius = Math.min(86, chart.height * 0.31);
        const strokeWidth = Math.max(24, radius * 0.34);
        const sharedAttributes = {
            cx: centreX,
            cy: centreY,
            r: radius,
            fill: 'none',
            'stroke-width': strokeWidth,
            'pathLength': 100,
            transform: `rotate(-90 ${centreX} ${centreY})`
        };
        const remaining = svgNode('circle', Object.assign({}, sharedAttributes, {
            stroke: palette.white,
            'stroke-opacity': 0.22
        }));
        const hospital = svgNode('circle', Object.assign({}, sharedAttributes, {
            stroke: palette.priorities['1-RED (COMBINED)'],
            'stroke-dasharray': `${hospitalShare} ${100 - hospitalShare}`,
            'stroke-linecap': 'butt'
        }));
        chart.svg.append(remaining, hospital);
        bindChartTooltip(remaining, mount, `${100 - hospitalShare}% remains for travel, on-scene response and other duties.`);
        bindChartTooltip(hospital, mount, `${hospitalShare}% of an average paramedic shift is spent in hospital.`);

        const centreLabel = svgNode('text', {
            x: centreX,
            y: centreY - 5,
            fill: palette.white,
            'font-weight': 800,
            'text-anchor': 'middle'
        });
        const percentage = svgNode('tspan', { x: centreX, 'font-size': 27 }, `${hospitalShare}%`);
        const description = svgNode('tspan', { x: centreX, dy: 23, 'font-size': 12 }, 'spent in hospital');
        centreLabel.append(percentage, description);
        chart.svg.appendChild(centreLabel);
    }

    function renderMultiHour(figure, rows) {
        const mount = figure.querySelector('[data-chart-mount]');
        const legend = figure.querySelector('[data-chart-legend]');
        const palette = chartPalette(figure);
        const priorities = ['0-PURPLE', '1-RED (COMBINED)', '3-ORANGE', '4-YELLOW'];
        const compact = mount.getBoundingClientRect().width < 560;
        const width = Math.max(320, Math.round(mount.getBoundingClientRect().width));
        const height = compact ? 390 : 430;
        const pixelRatio = Math.min(2, window.devicePixelRatio || 1);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(width * pixelRatio);
        canvas.height = Math.round(height * pixelRatio);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        canvas.setAttribute('aria-hidden', 'true');
        mount.replaceChildren(canvas);
        const context = canvas.getContext('2d');
        context.scale(pixelRatio, pixelRatio);
        const left = compact ? 58 : 82;
        const right = width - (compact ? 14 : 24);
        const top = 48;
        const bottom = height - 48;
        const laneHeight = (bottom - top) / priorities.length;
        const minimumSeconds = 3600;
        const maximumSeconds = 8 * 3600;
        const pointIndex = new Map();
        const occupancy = new Map();
        const hourlyTotals = new Map();

        rows.forEach(function(row) {
            const priority = row['Final Priority'];
            const seconds = Number(row['Response Time (sec)']);
            const count = Number(row.Count);
            if (!priorities.includes(priority) || seconds < minimumSeconds || !count) return;
            const hour = Math.min(8, Math.floor(seconds / 3600));
            hourlyTotals.set(hour, (hourlyTotals.get(hour) || 0) + count);
        });

        function xScale(seconds) {
            return left + (right - left) * Math.max(0, Math.min(1, (seconds - minimumSeconds) / (maximumSeconds - minimumSeconds)));
        }

        function responseLabel(seconds) {
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            const remainder = seconds % 60;
            return `${hours} hr ${minutes} min ${remainder} sec`;
        }

        legend.replaceChildren(...priorities.map(function(priority) {
            const item = document.createElement('span');
            const dot = document.createElement('i');
            dot.style.background = palette.priorities[priority];
            item.append(dot, document.createTextNode(shortPriority(priority)));
            return item;
        }));

        context.font = `700 ${compact ? 9 : 11}px "JetBrains Mono", monospace`;
        context.textBaseline = 'middle';
        priorities.forEach(function(priority, priorityIndex) {
            const centreY = top + laneHeight * (priorityIndex + 0.5);
            context.strokeStyle = palette.grid;
            context.globalAlpha = 0.18;
            context.beginPath();
            context.moveTo(left, centreY);
            context.lineTo(right, centreY);
            context.stroke();
            context.globalAlpha = 1;
            context.fillStyle = palette.priorities[priority];
            context.textAlign = 'right';
            context.fillText(shortPriority(priority), left - 8, centreY);
        });

        for (let hour = 1; hour <= 8; hour += 1) {
            const x = xScale(hour * 3600);
            context.strokeStyle = palette.white;
            context.lineWidth = hour === 1 || hour === 8 ? 1.25 : 1;
            context.globalAlpha = hour === 1 || hour === 8 ? 0.52 : 0.3;
            context.beginPath();
            context.moveTo(x, top - 10);
            context.lineTo(x, bottom + 8);
            context.stroke();
            context.globalAlpha = 1;
            context.lineWidth = 1;
            if (compact && hour === 7) continue;
            context.fillStyle = palette.white;
            context.textAlign = hour === 1 ? 'left' : hour === 8 ? 'right' : 'center';
            context.fillText(hour === 8 ? '8+ hr' : `${hour} hr`, x, height - 22);
        }

        context.fillStyle = palette.white;
        context.textBaseline = 'middle';
        for (let hour = 1; hour <= 8; hour += 1) {
            const total = hourlyTotals.get(hour) || 0;
            const x = hour === 8
                ? right
                : (xScale(hour * 3600) + xScale((hour + 1) * 3600)) / 2;
            context.textAlign = hour === 8 ? 'right' : 'center';
            context.font = `700 ${compact ? 8 : 10}px "JetBrains Mono", monospace`;
            context.fillText(`${total.toLocaleString()}${compact ? '' : ' calls'}`, x, 17);
        }
        context.font = `700 ${compact ? 9 : 11}px "JetBrains Mono", monospace`;

        rows.forEach(function(row) {
            const priority = row['Final Priority'];
            const seconds = Number(row['Response Time (sec)']);
            const count = Number(row.Count);
            const priorityIndex = priorities.indexOf(priority);
            if (priorityIndex < 0 || seconds < minimumSeconds || !count) return;
            const baseX = xScale(seconds);
            const centreY = top + laneHeight * (priorityIndex + 0.5);
            for (let rank = 0; rank < count; rank += 1) {
                const bucket = `${priority}|${Math.round(baseX / 3)}`;
                const slot = occupancy.get(bucket) || 0;
                occupancy.set(bucket, slot + 1);
                const verticalRank = slot % 19;
                const layer = Math.floor(slot / 19);
                const offset = verticalRank ? Math.ceil(verticalRank / 2) * (verticalRank % 2 ? 3.2 : -3.2) : 0;
                const x = Math.max(left, Math.min(right, baseX + (layer ? (layer % 2 ? 1 : -1) * Math.ceil(layer / 2) * 1.4 : 0)));
                const y = centreY + offset;
                const point = { x: x, y: y, seconds: seconds, priority: priority };
                const indexKey = `${Math.floor(x / 12)}|${Math.floor(y / 12)}`;
                if (!pointIndex.has(indexKey)) pointIndex.set(indexKey, []);
                pointIndex.get(indexKey).push(point);
                context.fillStyle = palette.priorities[priority];
                context.globalAlpha = 0.62;
                context.beginPath();
                context.arc(x, y, compact ? 1.45 : 1.7, 0, Math.PI * 2);
                context.fill();
            }
        });
        context.globalAlpha = 1;

        const tooltip = document.createElement('div');
        tooltip.className = 'SA_ems-data-chart__tooltip';
        tooltip.setAttribute('role', 'tooltip');
        mount.appendChild(tooltip);

        function hideTooltip() {
            tooltip.classList.remove('SA_ems-data-chart__tooltip--visible');
        }

        canvas.addEventListener('pointermove', function(event) {
            const bounds = canvas.getBoundingClientRect();
            const x = event.clientX - bounds.left;
            const y = event.clientY - bounds.top;
            let nearest = null;
            let nearestDistance = 64;
            const indexX = Math.floor(x / 12);
            const indexY = Math.floor(y / 12);
            for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
                for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
                    (pointIndex.get(`${indexX + offsetX}|${indexY + offsetY}`) || []).forEach(function(point) {
                        const distance = Math.pow(point.x - x, 2) + Math.pow(point.y - y, 2);
                        if (distance < nearestDistance) {
                            nearest = point;
                            nearestDistance = distance;
                        }
                    });
                }
            }
            if (!nearest) {
                hideTooltip();
                return;
            }
            tooltip.textContent = `${shortPriority(nearest.priority)} call · ${responseLabel(nearest.seconds)} response`;
            tooltip.classList.add('SA_ems-data-chart__tooltip--visible');
            const tooltipWidth = tooltip.offsetWidth;
            const preferredLeft = x > bounds.width / 2 ? x - tooltipWidth - 12 : x + 12;
            tooltip.style.left = `${Math.max(8, Math.min(bounds.width - tooltipWidth - 8, preferredLeft))}px`;
            tooltip.style.top = `${Math.max(18, y)}px`;
        });
        canvas.addEventListener('pointerleave', hideTooltip);
    }

    function renderFallWaits(figure, rows) {
        const mount = figure.querySelector('[data-chart-mount]');
        const palette = chartPalette(figure);
        const chart = createSvg(mount, 220);
        const left = 76;
        const right = chart.width - 22;
        const top = 62;
        const rowGap = 74;
        const maximum = Math.max.apply(null, rows.map(function(row) { return Number(row.Count); }));
        const colours = [palette.priorities['3-ORANGE'], palette.priorities['1-RED (COMBINED)']];

        rows.forEach(function(row, index) {
            const count = Number(row.Count);
            const y = top + index * rowGap;
            const width = (right - left) * count / maximum;
            addText(chart.svg, left - 10, y + 6, `${row.Threshold}+`, { fill: palette.white, 'font-size': 12, 'font-weight': 800, 'text-anchor': 'end' });
            chart.svg.appendChild(svgNode('rect', { x: left, y: y - 13, width: right - left, height: 26, fill: palette.white, 'fill-opacity': 0.08, rx: 2 }));
            const bar = svgNode('rect', { x: left, y: y - 13, width: Math.max(2, width), height: 26, fill: colours[index], rx: 2 });
            chart.svg.appendChild(bar);
            addText(chart.svg, Math.min(right, left + width + 8), y + 6, count.toLocaleString(), {
                fill: palette.white,
                'font-size': 13,
                'font-weight': 800,
                'text-anchor': left + width + 48 > right ? 'end' : 'start'
            });
            bindChartTooltip(bar, mount, `${count.toLocaleString()} calls involving falls had an ambulance response time of ${row.Threshold} or longer.`);
        });
    }

    function renderHourly(figure, rows) {
        const mount = figure.querySelector('[data-chart-mount]');
        const legend = figure.querySelector('[data-chart-legend]');
        const palette = chartPalette(figure);
        const compact = mount.getBoundingClientRect().width < 540;
        const chart = createSvg(mount, figure.classList.contains('SA_ems-data-chart--float') ? 330 : (compact ? 430 : 500));
        const left = compact ? 48 : 62;
        const right = chart.width - (compact ? 48 : 62);
        const top = 34;
        const bottom = chart.height - 58;
        const maxCalls = 18000;
        const maxMinutes = 70;
        const callColour = palette.priorities['4-YELLOW'];
        const timeColour = palette.priorities['1-RED (COMBINED)'];

        legend.replaceChildren();
        [['Calls received', callColour], ['P90 response', timeColour]].forEach(function(item) {
            const span = document.createElement('span');
            const dot = document.createElement('i');
            dot.style.background = item[1];
            span.append(dot, document.createTextNode(item[0]));
            legend.appendChild(span);
        });

        [0, 20, 40, 60].forEach(function(minutes) {
            const y = bottom - (bottom - top) * minutes / maxMinutes;
            chart.svg.appendChild(svgNode('line', { x1: left, x2: right, y1: y, y2: y, stroke: palette.grid, 'stroke-opacity': minutes ? 0.18 : 0.45 }));
            addText(chart.svg, right + 8, y + 4, `${minutes}m`, { fill: palette.white, 'font-size': 10 });
            addText(chart.svg, left - 8, y + 4, `${Math.round(maxCalls * minutes / maxMinutes / 1000)}k`, { fill: palette.white, 'font-size': 10, 'text-anchor': 'end' });
        });
        addText(chart.svg, left, 17, 'Calls', { fill: palette.white, 'font-size': 10 });
        addText(chart.svg, right, 17, 'P90 minutes', { fill: palette.white, 'font-size': 10, 'text-anchor': 'end' });

        const callPoints = [];
        const timePoints = [];
        rows.forEach(function(row, index) {
            const x = left + (right - left) * index / Math.max(1, rows.length - 1);
            const callsY = bottom - (bottom - top) * Number(row.Count) / maxCalls;
            const minutes = Number(row['P90 (sec)']) / 60;
            const timeY = bottom - (bottom - top) * minutes / maxMinutes;
            callPoints.push(`${x},${callsY}`);
            timePoints.push(`${x},${timeY}`);
            if (index % 3 === 0) addText(chart.svg, x, bottom + 25, String(index), { fill: palette.white, 'font-size': 10, 'text-anchor': 'middle' });
        });
        chart.svg.appendChild(svgNode('polyline', { points: callPoints.join(' '), fill: 'none', stroke: callColour, 'stroke-width': 3, 'stroke-linejoin': 'round' }));
        chart.svg.appendChild(svgNode('polyline', { points: timePoints.join(' '), fill: 'none', stroke: timeColour, 'stroke-width': 3, 'stroke-linejoin': 'round' }));

        const guide = svgNode('line', { y1: top, y2: bottom, stroke: palette.white, 'stroke-width': 1, 'stroke-dasharray': '4 4', opacity: 0, 'pointer-events': 'none' });
        chart.svg.appendChild(guide);
        const spacing = (right - left) / Math.max(1, rows.length - 1);
        rows.forEach(function(row, index) {
            const x = left + spacing * index;
            const hour = Number(row['Hour of Day (0-23)']);
            const nextHour = (hour + 1) % 24;
            const label = `${String(hour).padStart(2, '0')}:00–${String(nextHour).padStart(2, '0')}:00\n${Number(row.Count).toLocaleString()} calls\nP90 response: ${(Number(row['P90 (sec)']) / 60).toFixed(1)} minutes`;
            const hitArea = svgNode('rect', { x: Math.max(left, x - spacing / 2), y: top, width: index === 0 || index === rows.length - 1 ? spacing / 2 : spacing, height: bottom - top, fill: 'transparent' });
            chart.svg.appendChild(hitArea);
            bindChartTooltip(hitArea, mount, label, { node: guide, x: x });
        });
    }

    function renderTrends(figure, rows) {
        const priorities = ['0-PURPLE', '1-RED (COMBINED)', '3-ORANGE', '4-YELLOW'];
        const mount = figure.querySelector('[data-chart-mount]');
        const legend = figure.querySelector('[data-chart-legend]');
        const palette = chartPalette(figure);
        const compact = mount.getBoundingClientRect().width < 540;
        const chart = createSvg(mount, compact ? 430 : 500);
        const left = compact ? 45 : 62;
        const right = chart.width - (compact ? 45 : 62);
        const top = 28;
        const bottom = chart.height - 58;
        const months = Array.from(new Set(rows.map(function(row) { return row['Year-Month']; }))).sort();
        const maximum = Math.ceil(Math.max.apply(null, rows.filter(function(row) { return priorities.includes(row['Final Priority']); }).map(function(row) { return Number(row['Mean (sec)']) / 60; })) / 10) * 10;
        const monthNames = ['Jan.', 'Feb.', 'March', 'April', 'May', 'June', 'July', 'Aug.', 'Sept.', 'Oct.', 'Nov.', 'Dec.'];

        function formatMonth(month) {
            const parts = month.split('-');
            return `${monthNames[Number(parts[1]) - 1]} ’${parts[0].slice(2)}`;
        }

        legend.replaceChildren(...priorities.map(function(priority) {
            const item = document.createElement('span');
            const dot = document.createElement('i');
            dot.style.background = palette.priorities[priority];
            item.append(dot, document.createTextNode(shortPriority(priority)));
            return item;
        }));

        for (let minutes = 0; minutes <= maximum; minutes += 15) {
            const y = bottom - (bottom - top) * minutes / maximum;
            chart.svg.appendChild(svgNode('line', { x1: left, x2: right, y1: y, y2: y, stroke: palette.grid, 'stroke-opacity': minutes === 0 ? 0.45 : 0.18 }));
            addText(chart.svg, left - 8, y + 4, `${minutes}`, { fill: palette.muted, 'font-size': 9, 'text-anchor': 'end' });
        }
        addText(chart.svg, left, 14, 'Minutes', { fill: palette.muted, 'font-size': 10 });

        months.forEach(function(month, index) {
            if (compact && index % 2) return;
            const x = left + (right - left) * index / Math.max(1, months.length - 1);
            addText(chart.svg, x, bottom + 26, formatMonth(month), { fill: palette.white, 'font-size': 10, 'text-anchor': 'middle' });
        });

        priorities.forEach(function(priority) {
            const series = months.map(function(month) {
                return rows.find(function(row) { return row['Year-Month'] === month && row['Final Priority'] === priority; });
            }).filter(Boolean);
            const points = series.map(function(row, index) {
                const x = left + (right - left) * index / Math.max(1, months.length - 1);
                const y = bottom - (bottom - top) * (Number(row['Mean (sec)']) / 60) / maximum;
                return `${x},${y}`;
            }).join(' ');
            chart.svg.appendChild(svgNode('polyline', { points: points, fill: 'none', stroke: palette.priorities[priority], 'stroke-width': 3, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
            series.forEach(function(row, index) {
                const x = left + (right - left) * index / Math.max(1, months.length - 1);
                const minutes = Number(row['Mean (sec)']) / 60;
                const y = bottom - (bottom - top) * minutes / maximum;
                const point = svgNode('circle', { cx: x, cy: y, r: compact ? 4 : 5, fill: palette.priorities[priority], stroke: palette.white, 'stroke-width': 1 });
                chart.svg.appendChild(point);
            });
        });

        const guide = svgNode('line', { y1: top, y2: bottom, stroke: palette.white, 'stroke-width': 1, 'stroke-dasharray': '4 4', opacity: 0, 'pointer-events': 'none' });
        chart.svg.appendChild(guide);
        const monthSpacing = (right - left) / Math.max(1, months.length - 1);
        months.forEach(function(month, index) {
            const x = left + monthSpacing * index;
            const monthRows = priorities.map(function(priority) {
                return rows.find(function(row) { return row['Year-Month'] === month && row['Final Priority'] === priority; });
            }).filter(Boolean);
            const tooltipText = [{ text: formatMonth(month) }].concat(monthRows.map(function(row) {
                const minutes = Number(row['Mean (sec)']) / 60;
                return {
                    text: `${shortPriority(row['Final Priority'])}: ${minutes.toFixed(1)} min average · ${Number(row.Count).toLocaleString()} calls`,
                    colour: palette.priorities[row['Final Priority']]
                };
            }));
            const hitArea = svgNode('rect', {
                x: Math.max(left, x - monthSpacing / 2),
                y: top,
                width: index === 0 || index === months.length - 1 ? monthSpacing / 2 : monthSpacing,
                height: bottom - top,
                fill: 'transparent'
            });
            chart.svg.appendChild(hitArea);
            bindChartTooltip(hitArea, mount, tooltipText, { node: guide, x: x });
        });
    }

    function renderFigure(figure) {
        const type = figure.dataset.emsChart;
        if (!data[type]) return;
        if (type === 'targets') renderTargets(figure, data[type]);
        if (type === 'emergencies') renderEmergencies(figure, data[type]);
        if (type === 'escalation') renderEscalation(figure, data[type]);
        if (type === 'trends') renderTrends(figure, data[type]);
        if (type === 'availability') renderAvailability(figure, data[type]);
        if (type === 'hourly') renderHourly(figure, data[type]);
        if (type === 'staffing') renderStaffing(figure, data[type]);
        if (type === 'hospital') renderHospital(figure, data[type]);
        if (type === 'multi-hour') renderMultiHour(figure, data[type]);
        if (type === 'fall-waits') renderFallWaits(figure, data[type]);
    }

    Promise.all(Object.entries(files).map(function(entry) {
        return fetch(entry[1]).then(function(response) {
            if (!response.ok) throw new Error(`Unable to load ${entry[1]} (${response.status})`);
            return response.text();
        }).then(function(csv) { data[entry[0]] = parseCsv(csv); });
    })).then(function() {
        figures.forEach(renderFigure);
    }).catch(function(error) {
        figures.forEach(function(figure) {
            figure.querySelector('[data-chart-mount]').textContent = 'This graphic could not be loaded.';
        });
        console.error(error);
    });

    window.addEventListener('resize', function() {
        window.clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(function() { figures.forEach(renderFigure); }, 180);
    });
}

document.addEventListener('DOMContentLoaded', initializeEmsDataCharts);

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
