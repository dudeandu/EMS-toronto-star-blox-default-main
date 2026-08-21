// Vanilla Throttle implementation
function throttle(callback, limit) {
    var waiting = false; // Initially, we're not waiting
    return function() { // We return a throttled function
        if (!waiting) { // If we're not waiting
            callback.apply(this, arguments); // Execute users function
            waiting = true; // Prevent future invocations
            setTimeout(function() { // After a period of time
                waiting = false; // And allow future invocations
            }, limit);
        }
    }
}


function zoomableImageSetup(x) {
    if (x.matches) { // If media query matches
        mediumZoom(document.querySelectorAll('.SA_zoomable'), {
            // background: window.getComputedStyle(document.body, null).getPropertyValue('background-color'),
            background: "#000",
        })
    } else {
        mediumZoom(document.querySelectorAll('.SA_zoomable'), {
            margin: 25,
            container: {
                top: 0
            },
            // background: window.getComputedStyle(document.body, null).getPropertyValue('background-color'),
            background: "#000",
        })
    }
}


function adjustForNav() {
    if (exists(document.querySelector("#site-navbar-container"))) {
        if (document.querySelector("#site-navbar-container").getBoundingClientRect().height > 0) {
            var navOffset = document.querySelector("#site-navbar-container").getBoundingClientRect().height;
            // document.querySelectorAll("#SA_header_wrapper").forEach(function(el) {
            //     if (exists(el)) {
            //         el.style.paddingTop = navOffset + "px";
            //     }
            // })

            document.querySelectorAll(".SA_scrollytelling-wrapper").forEach(function(el) {
                el.style.marginTop = "0px"
            })
            document.querySelectorAll(".SA_fullscreen-image").forEach(function(el) {
                if (exists(el)) {
                    el.style.marginTop = navOffset + "px";
                    el.style.height = "calc(100vh - " + navOffset + "px)";
                }
            })
        }
    }
}

adjustForNav();

var x = window.matchMedia("(max-width: 1421px)")
zoomableImageSetup(x) // Call listener function at run time

var windowHeight = Math.max(
    document.body.scrollHeight, document.documentElement.scrollHeight,
    document.body.offsetHeight, document.documentElement.offsetHeight,
    document.body.clientHeight, document.documentElement.clientHeight
);
var windowWidth = window.innerWidth;
if (windowWidth <= 600) {
    var mobile = true;
} else {
    var mobile = false;
}

function onResize() {
    // setHeights()
    //still need to update pin durations
    // slideOffsets = [];
    windowHeight = Math.max(
        document.body.scrollHeight, document.documentElement.scrollHeight,
        document.body.offsetHeight, document.documentElement.offsetHeight,
        document.body.clientHeight, document.documentElement.clientHeight
    );
    if (windowWidth != window.innerWidth) {

        for (var i = scrollContainersScrollers.length - 1; i >= 0; i--) {
            scrollContainersScrollers[i].destroy();
        }
        for (var i = scrollers.length - 1; i >= 0; i--) {
            scrollers[i].destroy();
        }
        for (var i = scrollContainers.length - 1; i >= 0; i--) {
            scrollContainers[i].classList.add("SA_scrolltelling-section-" + i);
            init(i);
        }
    }
    windowWidth = window.innerWidth;
    if (windowWidth <= 600) {
        mobile = true;
    } else {
        mobile = false;
    }
}

var resize;
window.onresize = function() {
    clearTimeout(resize);
    resize = setTimeout(onResize, 300);
};


// var scroller = scrollama();


var scrollContainersScrollers = [];
var scrollers = [];

function executeFunctionByName(functionName, args) {
    var context = window
    var args = Array.prototype.slice.call(arguments, 1);
    var namespaces = functionName.split(".");
    var func = namespaces.pop();
    for (var i = 0; i < namespaces.length; i++) {
        context = context[namespaces[i]];
    }
    return context[func].apply(context, args);
}

var red = 'blue'

var scrollSnapping = false;
var scrollPos = 0;

const enableSnapping = throttle(function() {
    if (!scrollSnapping) {

        console.log('enable')
        if (document.querySelector("html").scrollTop > 0) {
            scrollPos = document.querySelector("html").scrollTop;
        }
        scrollSnapping = true;
        document.body.style.setProperty('scroll-snap-type', 'y mandatory');
        document.scrollingElement.style.setProperty('scroll-snap-type', 'y mandatory');
        if (document.querySelector("html").scrollTop < 1) {
            document.querySelector("html").scrollTop = scrollPos;
        }
        window.setTimeout(function() {
            if (document.querySelector("html").scrollTop < 500) {
                document.querySelector("html").scrollTop = scrollPos;
            }
        }, 20)
    }

}, 100);

// Disable snapping
const disableSnapping = throttle(function() {
    if (scrollSnapping) {

        console.log('disable')
        if (document.querySelector("html").scrollTop > 0) {
            scrollPos = document.querySelector("html").scrollTop;
        }
        scrollSnapping = false;
        document.body.style.setProperty('scroll-snap-type', 'none');
        document.scrollingElement.style.setProperty('scroll-snap-type', 'none');
        if (document.querySelector("html").scrollTop < 1) {
            document.querySelector("html").scrollTop = scrollPos;
        }
        window.setTimeout(function() {
            if (document.querySelector("html").scrollTop < 1) {
                document.querySelector("html").scrollTop = scrollPos;
            }
        }, 20)
    }
}, 100);

// scrollama event handlers

function handleStepProgress(response) {
    if (response.element.classList.contains('SA_scrollytelling-wrapper--snap')) {

        // calculate 1/4 screen height as a percentage of SA_scrollytelling-wrapper--snap height
        var snapElementHeight = getHeight(response.element)
        var enterSnapPercent = ((window.innerHeight * 0.4) / snapElementHeight);
        var exitSnapPercent = ((window.innerHeight * 1) / snapElementHeight);

        // if entering from the top
        if (response.progress > enterSnapPercent && response.progress < exitSnapPercent && response.direction == "down") {
            enableSnapping();
            console.log(enterSnapPercent)
        }
        // if exiting from the top
        else if (response.progress < exitSnapPercent && response.direction == "up") {
            disableSnapping();
        }
        // if entering from the bottom
        else if (response.progress > 1 - exitSnapPercent && response.direction == "up") {
            enableSnapping();
        }
        // if exiting from the bottom
        else if (response.progress > 1 - exitSnapPercent && response.direction == "down") {
            disableSnapping();
        }

        // if (response.progress > 0.1 && response.progress < 0.7) {
        //     enableSnapping();
        // } else {
        //     disableSnapping();
        // }
    }
    // Run custom code
    if (response.element.hasAttribute("data-on-progress")) {
        var callbackFunction = response.element.getAttribute('data-on-progress')
        // eval(callbackFunction)
        var args = callbackFunction.split(",").map(function(item) {
            return item.trim();
        });
        if (!exists(window[args[0]])) {
            var err = new Error("The function you are trying to call does not exist");
            throw err.stack;
            return
        }
        args.push(response)
        return executeFunctionByName.apply(null, args);
    }
}

function handleStepEnter(response) {
    // response = { element, direction, index }

    let container = response.element.parentNode.querySelector('.SA_scrollytelling-images');
    var images = container.querySelectorAll('.SA_fullscreen-image');

    // add current step image
    if (images.length == 1) {
        images[0].classList.add("SA_active-slide");
    } else if (exists(images[response.index])) {
        // remove any active slides first
        images.forEach(el => {
            el.classList.remove("SA_active-slide");
        })
        // next check if we are handling the enter for the wrapper or slide
        // we only want to set the slide if we are handling the slide enter
        if (response.element.classList.contains('SA_scrollytelling-slide')) {
            images[response.index].classList.add("SA_active-slide");
        }
    }
    // Run custom code
    if (response.element.hasAttribute("data-on-enter")) {
        var callbackFunction = response.element.getAttribute('data-on-enter')
        // eval(callbackFunction)
        var args = callbackFunction.split(",").map(function(item) {
            return item.trim();
        });
        if (!exists(window[args[0]])) {
            var err = new Error("The function you are trying to call does not exist");
            throw err.stack;
            return
        }
        args.push(response)
        return executeFunctionByName.apply(null, args);
    }
}

function handleStepExit(response) {
    // response = { element, direction, index }

    let container = response.element.parentNode.querySelector('.SA_scrollytelling-images');
    let wrapper = container.parentNode;

    var images = container.querySelectorAll('.SA_fullscreen-image');
    // remove current step image
    if (exists(images[response.index]) && images.length != 1 && response.index != images.length - 1) {

        if (images[response.index] != images[images.length - 1]) {
            images[response.index].classList.remove("SA_active-slide");
        } else {
            if (wrapper.classList.contains("SA_scrollytelling-wrapper--scroll-in")) {
                if (response.index == images.length - 1) {
                    // last slide
                    if (response.direction == "up") {
                        images[response.index].classList.remove("SA_active-slide");
                    }
                    // last slide exiting so do nothing
                } else {
                    images[response.index].classList.remove("SA_active-slide");
                }
            } else {
                images[response.index].classList.remove("SA_active-slide");
            }
        }
    } else if (response.direction == "down" && images.length == 1 && response.index == wrapper.querySelectorAll('.SA_scrollytelling-slide').length - 1 || response.index == 0 && response.direction == "up") {
        images[0].classList.remove("SA_active-slide");
    }

    // Run custom code
    if (response.element.hasAttribute("data-on-exit")) {
        var callbackFunction = response.element.getAttribute('data-on-exit')
        // eval(callbackFunction)
        var args = callbackFunction.split(",").map(function(item) {
            return item.trim();
        });
        if (!exists(window[args[0]])) {
            var err = new Error("The function you are trying to call does not exist");
            throw err.stack;
            return
        }
        args.push(response)
        return executeFunctionByName.apply(null, args);
    }

}

function init(index) {
    // 1. Check if parent has any events. If so set up a container scrollama
    // 2. Check if slides have any events
    // 3. bind scrollama event handlers (this can be chained like below)

    var containerHasProgress = false;
    if (document.querySelector(".SA_scrolltelling-section-" + index).classList.contains('SA_scrollytelling-wrapper--snap') || document.querySelector(".SA_scrolltelling-section-" + index).hasAttribute("data-on-progress")) {
        containerHasProgress = true;
    }
    scrollContainersScrollers[index] = scrollama();
    scrollContainersScrollers[index]
        .setup({
            step: '.SA_scrollytelling-wrapper',
            progress: containerHasProgress,
            debug: false
        })
        .onStepProgress(handleStepProgress)
        .onStepEnter(handleStepEnter)
        .onStepExit(handleStepExit);

    // Check if any slides have step progress and set progress to true
    var hasProgress = false;
    var slides = document.querySelector(".SA_scrolltelling-section-" + index).querySelectorAll('.SA_scrollytelling-slide')
    for (var i = slides.length - 1; i >= 0; i--) {

        // enable if you want to replace vh for mobile
        // if (exists(slides[i].querySelector(".SA_scroll-text-wrapper"))) {
        //     let el = slides[i].querySelector(".SA_scroll-text-wrapper")
            
        //     el.style.padding = window.getComputedStyle(el, null).getPropertyValue('padding');
        //     el.style.margin = window.getComputedStyle(el, null).getPropertyValue('margin');
        // }

        if (slides[i].hasAttribute("data-on-progress")) {
            hasProgress = true;
        }
    }
    var stepEl = ".SA_scrolltelling-section-" + index + " .SA_scrollytelling-slide";
    scrollers[index] = scrollama();
    scrollers[index]
        .setup({
            step: stepEl,
            progress: hasProgress,
            debug: false
        })
        .onStepProgress(handleStepProgress)
        .onStepEnter(handleStepEnter)
        .onStepExit(handleStepExit);
}

let scrollContainers = document.querySelectorAll('.SA_scrollytelling-wrapper');

// Animate on enter elements
var onEnterElements = [];
let onEnterContainers = document.querySelectorAll('.SA_animate');

function startPage() {
    window.setTimeout(function() {
        // kick things off
        for (var i = scrollContainers.length - 1; i >= 0; i--) {
            scrollContainers[i].classList.add("SA_scrolltelling-section-" + i);
            init(i);
        }


        // Animate on enter
        for (var i = onEnterContainers.length - 1; i >= 0; i--) {
            initOnEnter(i);
        }
        checkContainerPos()
    }, 100)
}

// vanilla js document ready 
// https://plainjs.com/javascript/events/running-code-when-the-document-is-ready-15/
if (document.readyState != 'loading') startPage();
// modern browsers
else if (document.addEventListener) document.addEventListener('DOMContentLoaded', startPage);
// IE <= 8
else document.attachEvent('onreadystatechange', function() {
    if (document.readyState == 'complete') startPage();
});

function checkContainerPos() {
    for (var i = onEnterContainers.length - 1; i >= 0; i--) {
        //detect scroll position
        var elOffset = onEnterContainers[i].getBoundingClientRect().top + window.pageYOffset;

        // Code to handdle offset not yet working

        // if (onEnterContainers[i].hasAttribute("data-offset")) {
        //     elOffset = elOffset + (window.pageYOffset * onEnterContainers[i].getAttribute("data-offset"))
        // } else {
        //     // default
        //     elOffset = elOffset + (window.pageYOffset * 0.6)
        // }

        if (elOffset < window.pageYOffset + window.innerHeight && elOffset > 0) {
            // console.log(onEnterContainers[i])
            // console.log(elOffset + " vs " + (window.pageYOffset + window.innerHeight))
            onEnterContainers[i].classList.add("SA_active");
        }
    }
}

function initOnEnter(index) {
    // 1. setup the scroller with the bare-bones settings
    // 2. this will also initialize trigger observations
    // 3. bind scrollama event handlers (this can be chained like below)

    // Check if any slides have step progress and set progress to true

    // if (onEnterContainers[index].hasAttribute("data-reveal-percentage")) {
    //     console.log(onEnterContainers[index].getAttribute('data-reveal-percentage') / 100)
    //     var elOffset = onEnterContainers[index].getAttribute('data-reveal-percentage') / 100
    // } else {
    //     var elOffset = 0.5;
    // }
    // use data-offset="0.8" or data-offset="100px" instead

    var hasProgress = false;
    if (onEnterContainers[index].hasAttribute("data-on-progress")) {
        hasProgress = true;
    }

    // var scrollOffset = window.innerHeight * 0.6 +"px"

    onEnterElements[index] = scrollama();
    onEnterElements[index]
        .setup({
            step: '.SA_animate',
            progress: hasProgress,
            debug: false,
            offset: 0.6
        })
        .onStepEnter(onEnterElementEnter)
        .onStepProgress(onEnterElementProgress)
        .onStepExit(onEnterElementExit);

}

function onEnterElementProgress(response) {
    // Run custom code
    //alert(response.element.classList)
    if (response.element.hasAttribute("data-on-progress")) {
        var callbackFunction = response.element.getAttribute('data-on-progress')
        // eval(callbackFunction)
        var args = callbackFunction.split(",").map(function(item) {
            return item.trim();
        });
        if (!exists(window[args[0]])) {
            var err = new Error("The function you are trying to call does not exist");
            throw err.stack;
            return
        }
        args.push(response)
        return executeFunctionByName.apply(null, args);
    }
}

function onEnterElementEnter(response) {
    // response = { element, direction, index }
    // Run custom code
    if (response.direction == "down") {
        if (response.element.hasAttribute("data-on-enter")) {
            var callbackFunction = response.element.getAttribute('data-on-enter')
            // eval(callbackFunction)
            var args = callbackFunction.split(",").map(function(item) {
                return item.trim();
            });
            if (!exists(window[args[0]])) {
                var err = new Error("The function you are trying to call does not exist");
                throw err.stack;
                return
            }
            args.push(response)
            return executeFunctionByName.apply(null, args);
        }
        // add current step image
        response.element.classList.add("SA_active");
    }
}

function onEnterElementExit(response) {
    // response = { element, direction, index }
    // Run custom code
    if (response.direction == "up") {
        if (response.element.hasAttribute("data-on-exit")) {
            var callbackFunction = response.element.getAttribute('data-on-exit')
            // eval(callbackFunction)
            var args = callbackFunction.split(",").map(function(item) {
                return item.trim();
            });
            if (!exists(window[args[0]])) {
                var err = new Error("The function you are trying to call does not exist");
                throw err.stack;
                return
            }
            args.push(response)
            return executeFunctionByName.apply(null, args);
        }
        // add current step image
        response.element.classList.remove("SA_active");
    }
}

//Start helper functions
// Translate range
function translateRange(number, fromStart, fromEnd, toStart, toEnd) {
    return (number - fromStart) * ((toEnd - toStart) / (fromEnd - fromStart)) + toStart
}

// Add commas to numbers
function numberWithCommas(element) {
    return element.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Get random number between min and max
function getRandom(min, max) {
    return Math.random() * (max - min) + min;
}

// Ajax request
function ajaxRequest(url, successFunction) {
    var request = new XMLHttpRequest();
    request.open('GET', url, true);

    request.onload = function() {
        if (this.status >= 200 && this.status < 400) {
            // Success!
            var resp = this.response;
            successFunction(resp)
        } else {
            // We reached our target server, but it returned an error

        }
    };

    request.onerror = function() {
        // There was a connection error of some sort
    };

    request.send();
}

// Get height
function getHeight(element) {
    return parseFloat(getComputedStyle(element, null).height.replace("px", ""))
}

// Get width
function getWidth(element) {
    return parseFloat(getComputedStyle(element, null).width.replace("px", ""))
}

// Set height
function setHeight(element, val) {
    if (typeof val === "function") val = val();
    if (typeof val === "string") element.style.height = val;
    else element.style.height = val + "px";
}

// Set width
function setWidth(element, val) {
    if (typeof val === "function") val = val();
    if (typeof val === "string") element.style.width = val;
    else element.style.width = val + "px";
}

// Get offset top (with scrollY)
function offsetTop(element) {
    var rect = element.getBoundingClientRect();
    return rect.bottom + window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
}

// Get offset left (with scrollX)
function offsetLeft(element) {
    var rect = element.getBoundingClientRect();
    return rect.left + window.pageXOffset || document.documentElement.scrollLeft || document.body.scrollLeft || 0;
}

// Check if element has selector
// if matches(element, '.some-class') => do something | returns true or false
function matches(element, selector) {
    return (element.matches || element.matchesSelector || element.msMatchesSelector || element.mozMatchesSelector || element.webkitMatchesSelector || element.oMatchesSelector).call(element, selector);
};

// Check if element exists
function exists(element) {
    if (typeof(element) != 'undefined' && element != null) {
        return true;
    } else {
        return false;
    }
}

// $(document).ready(function()
function ready(callback) {
    if (document.readyState != 'loading') {
        callback();
    } else {
        document.addEventListener('DOMContentLoaded', callback);
    }
}

// Parse HTML
function parseHTML(str) {
    var tmp = document.implementation.createHTMLDocument();
    tmp.body.innerHTML = str;
    return tmp.body.children;
};

// Parse HTML usage:
// var wrapper = document.body.querySelector('#wrapper'),
// str = "hello, <b>my name is</b> jQuery.",
// html = parseHTML(str)
//  wrapper.append( html );

// Create dom nodes
// Create new element function  
function newElement(type, attr, children) {
    var el = document.createElement(type);
    for (var n in attr) {
        if (n == 'style') {
            setStyle(el, attr[n]);
            /* implementation of this function
             * left as exercise for the reader
             */
        } else if (n == 'data') {
            el.setAttribute("data-id", attr[n]);

        } else {
            el[n] = attr[n];
        }
    }
    if (children) {
        for (var i = 0; i < children.length; i++) {
            el.appendChild(children[i]);
        }
    }
    return el
}
// Create new text function  
function newText(text) {
    var el = document.createTextNode(text);
    return el
}

// Create dom nodes usage:
// var node =  newElement('span', { className: 'class' }, [
//  newText('text here')
// ]);
// document.querySelector(body).appendChild(node)

//end helper functions
