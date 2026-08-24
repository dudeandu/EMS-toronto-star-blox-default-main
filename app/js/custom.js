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
        return {
            step: steps[activeIndex],
            centreSeconds: startSeconds + (endSeconds - startSeconds) * Math.max(0, Math.min(1, amount))
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
        const targetStages = { 'targets-purple': 1, 'targets-red': 3, 'targets-orange': 4, 'targets-yellow': 5, means: 5, p90: 5 };
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
            const text = svgElement('text', { x: centre, y: y - 7, class: 'SA_bees-reference__label', fill: colours[priority] });
            text.textContent = width < 600 ? label.replace(/TARGET (RED ACP|RED PCP|PURPLE|ORANGE|YELLOW)/, 'TARGET') : label;
            group.appendChild(text);
        });

        if (mode === 'means' || mode === 'p90') {
            priorityOrder.forEach(function(priority, index) {
                const centre = left + laneWidth * (index + 0.5);
                const x1 = centre - laneWidth * 0.43;
                const x2 = centre + laneWidth * 0.43;
                const y = yScale(meanArrivals[index]);
                const text = svgElement('text', { x: centre, y: y + 13, class: 'SA_bees-reference__label SA_bees-reference__label--mean', fill: colours[priority] });
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
        const yScale = function(seconds) { return top + ((seconds - minSeconds) / visibleSpan) * (bottom - top); };

        buildSwarmLayer(width, left, right);
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

        const sourceY = (minSeconds / (8 * 3600)) * swarmLayerHeight;
        const sourceHeight = (visibleSpan / (8 * 3600)) * swarmLayerHeight;
        context.drawImage(swarmLayer, 0, sourceY, width, sourceHeight, 0, top, width, bottom - top);

        const tickStart = Math.ceil(minSeconds / 900) * 900;
        for (let seconds = tickStart; seconds <= maxSeconds; seconds += 900) {
            const y = yScale(seconds);
            context.strokeStyle = seconds % 3600 === 0 ? 'rgba(255,255,255,0.24)' : 'rgba(255,255,255,0.1)';
            context.beginPath();
            context.moveTo(left, y);
            context.lineTo(right, y);
            context.stroke();
            context.fillStyle = 'rgba(255,255,255,0.72)';
            context.textAlign = 'right';
            context.fillText(formatDuration(seconds), left - 6, y);
        }

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
