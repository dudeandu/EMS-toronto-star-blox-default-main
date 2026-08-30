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
    const timelineAnchors = Array.from(wrapper.querySelectorAll('[data-opening-timeline-progress]')).map(function(slide) {
        return {
            distance: Math.max(0, slide.offsetTop + slide.offsetHeight * 0.5 - window.innerHeight * 0.5),
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
    timeline.style.setProperty('--timeline-offset', `${timelineProgress * -100}%`);
    timeline.style.setProperty('--timeline-opacity', String(timelineReveal));

    const background = wrapper.querySelector('.SA_opening-timeline__background');
    if (background) {
        background.style.setProperty('--timeline-image-scale', String(1.06 + overallProgress * 0.07));
        background.style.setProperty('--timeline-image-y', `${overallProgress * -1.5}vh`);
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
    const priorityOrder = ['0-PURPLE', '1-RED (ACP)', '2-RED (PCP)', '3-ORANGE', '4-YELLOW'];
    const colourProperties = ['--bees-purple', '--bees-red-acp', '--bees-red-pcp', '--bees-orange', '--bees-yellow'];
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
    const priorityOrder = ['0-PURPLE', '1-RED (ACP)', '2-RED (PCP)', '3-ORANGE', '4-YELLOW'];
    const responseTargets = [360, 539, 539, 1500, 2700];
    const meanArrivals = [537, 724, 786, 1598, 2516];
    const colourProperties = ['--bees-purple', '--bees-red-acp', '--bees-red-pcp', '--bees-orange', '--bees-yellow'];
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
        const startLinear = steps[from].dataset.mode && steps[from].dataset.mode !== 'linear' ? 0 : 1;
        const endLinear = steps[to].dataset.mode && steps[to].dataset.mode !== 'linear' ? 0 : 1;
        const boundedAmount = Math.max(0, Math.min(1, amount));
        return {
            step: steps[activeIndex],
            centreSeconds: startSeconds + (endSeconds - startSeconds) * boundedAmount,
            linearAmount: startLinear + (endLinear - startLinear) * boundedAmount
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
        const boxWidth = Math.min(width - 32, 500);
        const boxX = (width - boxWidth) / 2;
        const textX = boxX + 18;
        const textWidth = boxWidth - 36;
        const titleClass = 'SA_bees-annotation__title SA_bees-annotation__title--intro';
        const copyClass = 'SA_bees-annotation__copy SA_bees-annotation__copy--intro';
        const titleHeight = wrappedTextLines(step.dataset.title, textWidth, titleClass).length * 21;
        const copyHeight = wrappedTextLines(step.dataset.copy, textWidth, copyClass).length * 18;
        const boxHeight = 82 + titleHeight + copyHeight;
        const boxY = Math.min(height - boxHeight - 24, Math.max(height / 2 + 24, height * 0.56));
        group.appendChild(svgElement('rect', { x: boxX, y: boxY, width: boxWidth, height: boxHeight, rx: 3, class: 'SA_bees-annotation__box' }));
        addWrappedText(group, step.dataset.title, textX, boxY + 34, textWidth, titleClass, 21);
        addWrappedText(group, step.dataset.copy, textX, boxY + 48 + titleHeight, textWidth, 'SA_bees-annotation__copy SA_bees-annotation__copy--intro', 18);
    }

    function drawReferenceOverlay(step, width, height, left, laneWidth, yScale, includePanel) {
        svg.replaceChildren();
        svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        svg.setAttribute('aria-label', `${step.dataset.title}. ${step.dataset.copy}`);
        const group = svgElement('g', { class: 'SA_bees-annotation' });
        const mode = step.dataset.mode;
        const targetStages = { 'targets-purple': 1, 'targets-all': 5, means: 5, p90: 5, linear: 5 };
        const targetCount = targetStages[mode] || 0;

        priorityOrder.forEach(function(priority, index) {
            if (index >= targetCount) return;
            const centre = left + laneWidth * (index + 0.5);
            const x1 = centre - laneWidth * 0.43;
            const x2 = centre + laneWidth * 0.43;
            const y = yScale(responseTargets[index]);
            const label = index === 0 ? 'TARGET PURPLE · 6:00'
                : index === 1 ? 'TARGET RED ACP · 8:59'
                : index === 2 ? 'TARGET RED PCP · 8:59'
                : index === 3 ? 'TARGET ORANGE · 25:00'
                : 'TARGET YELLOW · 45:00';
            group.appendChild(svgElement('line', { x1: x1, y1: y, x2: x2, y2: y, class: 'SA_bees-reference SA_bees-reference--target', stroke: colours[priority] }));
            const labelY = responseTargets[index] <= meanArrivals[index] ? y - 7 : y + 16;
            const text = svgElement('text', { x: centre, y: labelY, class: 'SA_bees-reference__label', fill: colours[priority] });
            text.textContent = width < 600 ? label.replace(/TARGET (RED ACP|RED PCP|PURPLE|ORANGE|YELLOW)/, 'TARGET') : label;
            group.appendChild(text);
        });

        if (mode === 'means' || mode === 'p90' || mode === 'linear') {
            priorityOrder.forEach(function(priority, index) {
                const centre = left + laneWidth * (index + 0.5);
                const x1 = centre - laneWidth * 0.43;
                const x2 = centre + laneWidth * 0.43;
                const y = yScale(meanArrivals[index]);
                const labelY = meanArrivals[index] <= responseTargets[index] ? y - 7 : y + 16;
                const text = svgElement('text', { x: centre, y: labelY, class: 'SA_bees-reference__label SA_bees-reference__label--mean', fill: colours[priority] });
                group.appendChild(svgElement('line', { x1: x1, y1: y, x2: x2, y2: y, class: 'SA_bees-reference SA_bees-reference--mean', stroke: colours[priority] }));
                text.textContent = `AVERAGE · ${formatDuration(meanArrivals[index])}`;
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
            context.strokeStyle = seconds % 3600 === 0 ? 'rgba(255,255,255,0.24)' : 'rgba(255,255,255,0.1)';
            context.beginPath();
            context.moveTo(left, y);
            context.lineTo(right, y);
            context.stroke();
            context.fillStyle = 'rgba(255,255,255,0.72)';
            context.textAlign = 'right';
            context.fillText(formatDuration(seconds), left - 6, y);
        });

        if (state.step.dataset.mode) {
            drawReferenceOverlay(state.step, width, height, left, laneWidth, yScale);
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
            }, width, height, left, laneWidth, yScale, false);
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

    fetch('images/data/priority_response_beeswarm_by_priority_time.csv')
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
        targets: 'images/data/slow_response_by_priority.csv',
        emergencies: 'images/data/response_time_by_problem_and_priority.csv',
        escalation: 'images/data/priority_escalation_summary.csv',
        trends: 'images/data/response_time_trend_by_priority.csv',
        availability: 'images/data/ambulance_availability.csv',
        hourly: 'images/data/response_time_by_hour.csv',
        staffing: 'images/data/paramedic_hiring_departures.csv',
        hospital: 'images/data/paramedic_shift_time.csv'
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
                '1-RED (ACP)': styles.getPropertyValue('--chart-red-acp').trim(),
                '2-RED (PCP)': styles.getPropertyValue('--chart-red-pcp').trim(),
                '3-ORANGE': styles.getPropertyValue('--chart-orange').trim(),
                '4-YELLOW': styles.getPropertyValue('--chart-yellow').trim()
            },
            white: styles.getPropertyValue('--chart-white').trim(),
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
        node.setAttribute('data-chart-tooltip', 'true');
        node.setAttribute('tabindex', '0');
        node.setAttribute('aria-label', label);

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
            element.textContent = label;
            element.style.left = `${x}px`;
            element.style.top = `${y}px`;
            element.classList.toggle('SA_ems-data-chart__tooltip--left', x > bounds.width / 2);
            element.classList.toggle('SA_ems-data-chart__tooltip--right', x <= bounds.width / 2);
            element.classList.add('SA_ems-data-chart__tooltip--visible');
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
            const p90Point = svgNode('circle', { cx: p90X, cy: y, r: 8, fill: palette.priorities['1-RED (ACP)'], stroke: palette.white, 'stroke-width': 1.5 });
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
        const colours = { Escalated: palette.priorities['1-RED (ACP)'], 'De-escalated': palette.priorities['4-YELLOW'], Unchanged: palette.muted };
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
        const yearColours = { '2019': palette.muted, '2023': palette.priorities['1-RED (ACP)'] };

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
        const colours = { Hired: palette.priorities['4-YELLOW'], Departed: palette.priorities['1-RED (ACP)'] };

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
        const cellSize = Math.min(32, (chart.width - 70) / 10);
        const gap = 5;
        const gridWidth = cellSize * 10 + gap * 9;
        const startX = (chart.width - gridWidth) / 2;
        const startY = 40;
        const hospitalShare = Number((rows.find(function(row) { return row.Activity === 'In hospital'; }) || {})['Share (%)']);

        for (let index = 0; index < 100; index += 1) {
            const hospital = index < hospitalShare;
            const x = startX + (index % 10) * (cellSize + gap);
            const y = startY + Math.floor(index / 10) * (cellSize / 2 + gap);
            const cell = svgNode('rect', { x: x, y: y, width: cellSize, height: cellSize / 2, rx: 2, fill: hospital ? palette.priorities['1-RED (ACP)'] : palette.white, 'fill-opacity': hospital ? 1 : 0.22 });
            chart.svg.appendChild(cell);
            bindChartTooltip(cell, mount, hospital ? '60% of an average paramedic shift is spent in hospital.' : '40% remains for travel, on-scene response and other duties.');
        }
        addText(chart.svg, chart.width / 2, chart.height - 12, '60% spent in hospital', { fill: palette.white, 'font-size': 15, 'font-weight': 800, 'text-anchor': 'middle' });
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
        const timeColour = palette.priorities['1-RED (ACP)'];

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
            if (index % 3 === 0) addText(chart.svg, x, bottom + 25, `${String(index).padStart(2, '0')}:00`, { fill: palette.white, 'font-size': 10, 'text-anchor': 'middle' });
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
        const priorities = ['0-PURPLE', '1-RED (ACP)', '2-RED (PCP)', '3-ORANGE', '4-YELLOW'];
        const mount = figure.querySelector('[data-chart-mount]');
        const legend = figure.querySelector('[data-chart-legend]');
        const palette = chartPalette(figure);
        const compact = mount.getBoundingClientRect().width < 540;
        const chart = createSvg(mount, compact ? 430 : 500);
        const left = compact ? 45 : 62;
        const right = chart.width - 24;
        const top = 28;
        const bottom = chart.height - 58;
        const months = Array.from(new Set(rows.map(function(row) { return row['Year-Month']; }))).sort();
        const maximum = Math.ceil(Math.max.apply(null, rows.filter(function(row) { return priorities.includes(row['Final Priority']); }).map(function(row) { return Number(row['P90 (sec)']) / 60; })) / 10) * 10;
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
                const y = bottom - (bottom - top) * (Number(row['P90 (sec)']) / 60) / maximum;
                return `${x},${y}`;
            }).join(' ');
            chart.svg.appendChild(svgNode('polyline', { points: points, fill: 'none', stroke: palette.priorities[priority], 'stroke-width': 3, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
            series.forEach(function(row, index) {
                const x = left + (right - left) * index / Math.max(1, months.length - 1);
                const minutes = Number(row['P90 (sec)']) / 60;
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
            const tooltipText = [formatMonth(month)].concat(monthRows.map(function(row) {
                const minutes = Number(row['P90 (sec)']) / 60;
                return `${shortPriority(row['Final Priority'])}: ${minutes.toFixed(1)} min P90 · ${Number(row.Count).toLocaleString()} calls`;
            })).join('\n');
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
