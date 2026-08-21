/**
 * Scrollytelling Framework
 * 
 * This file provides a comprehensive scrollytelling system for interactive storytelling.
 * It manages scroll-triggered animations, sticky images, and progressive content reveals
 * using the Scrollama library.
 * 
 * Main Features:
 * - ScrollContainer: Manages scrollytelling sections with sticky images
 * - AnimateOnEnter: Handles scroll-triggered animations
 * - ScrollytellingManager: Coordinates all scroll behavior across the page
 * - Debug utilities: Browser console tools for troubleshooting
 */

/* ================================================================
   NAVIGATION ADJUSTMENT
   ================================================================ */

/**
 * Adjusts scrollytelling elements to account for fixed navigation height
 * Ensures fullscreen images display correctly below the navbar
 */
function adjustForNav() {
    if (exists(document.querySelector("#site-navbar-container"))) {
        if (document.querySelector("#site-navbar-container").getBoundingClientRect().height > 0) {
            var navOffset = document.querySelector("#site-navbar-container").getBoundingClientRect().height;

            // Reset scrollytelling wrapper margins
            document.querySelectorAll(".SA_scrollytelling-wrapper").forEach(function(el) {
                el.style.marginTop = "0px"
            })
            
            // Adjust fullscreen images to account for navbar
            document.querySelectorAll(".SA_fullscreen-image").forEach(function(el) {
                if (exists(el)) {
                    el.style.marginTop = navOffset + "px";
                    el.style.height = "calc(100vh - " + navOffset + "px)";
                }
            })
        }
    }
}

// Execute navigation adjustment on page load
adjustForNav();

/* ================================================================
   GLOBAL VARIABLES
   ================================================================ */

// Calculate maximum window height across different measurement methods
var windowHeight = Math.max(
    document.body.scrollHeight, document.documentElement.scrollHeight,
    document.body.offsetHeight, document.documentElement.offsetHeight,
    document.body.clientHeight, document.documentElement.clientHeight
);

// Track window dimensions and mobile state
var windowWidth = window.innerWidth;
var mobile = windowWidth <= 600;

/* ================================================================
   UTILITY FUNCTIONS
   ================================================================ */

/**
 * Executes a function by its string name, supporting namespaced functions
 * Used for calling callback functions defined in data attributes
 * 
 * @param {string} functionName - The function name (e.g., "myNamespace.myFunction")
 * @param {*} args - Arguments to pass to the function
 * @returns {*} The function's return value
 */
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

/* ================================================================
   SCROLL SNAPPING FUNCTIONALITY
   ================================================================ */

// Track scroll snapping state
var scrollSnapping = false;
var scrollPos = 0;

/**
 * Enables CSS scroll snapping
 * Throttled to prevent excessive calls during scroll events
 * Preserves scroll position to prevent jumping
 */
const enableSnapping = throttle(function() {
    if (!scrollSnapping) {
        console.log('enable')
        // Store current scroll position
        if (document.querySelector("html").scrollTop > 0) {
            scrollPos = document.querySelector("html").scrollTop;
        }
        scrollSnapping = true;
        
        // Enable scroll snapping via CSS
        document.body.style.setProperty('scroll-snap-type', 'y mandatory');
        document.scrollingElement.style.setProperty('scroll-snap-type', 'y mandatory');
        
        // Restore scroll position if at top
        if (document.querySelector("html").scrollTop < 1) {
            document.querySelector("html").scrollTop = scrollPos;
        }
        
        // Additional position correction after a brief delay
        window.setTimeout(function() {
            if (document.querySelector("html").scrollTop < 500) {
                document.querySelector("html").scrollTop = scrollPos;
            }
        }, 20)
    }
}, 100);

/**
 * Disables CSS scroll snapping
 * Throttled to prevent excessive calls during scroll events
 * Preserves scroll position to prevent jumping
 */
const disableSnapping = throttle(function() {
    if (scrollSnapping) {
        console.log('disable')
        // Store current scroll position
        if (document.querySelector("html").scrollTop > 0) {
            scrollPos = document.querySelector("html").scrollTop;
        }
        scrollSnapping = false;
        
        // Disable scroll snapping via CSS
        document.body.style.setProperty('scroll-snap-type', 'none');
        document.scrollingElement.style.setProperty('scroll-snap-type', 'none');
        
        // Restore scroll position if at top
        if (document.querySelector("html").scrollTop < 1) {
            document.querySelector("html").scrollTop = scrollPos;
        }
        
        // Additional position correction after a brief delay
        window.setTimeout(function() {
            if (document.querySelector("html").scrollTop < 1) {
                document.querySelector("html").scrollTop = scrollPos;
            }
        }, 20)
    }
}, 100);

/* ================================================================
   SCROLLCONTAINER CLASS
   Manages individual scrollytelling sections with sticky images
   ================================================================ */

/**
 * ScrollContainer Class
 * Handles individual scrollytelling sections where images remain sticky
 * while text content scrolls past them
 */
class ScrollContainer {
    /**
     * @param {HTMLElement} element - The scrollytelling wrapper element
     * @param {number} index - The index of this container in the page
     */
    constructor(element, index) {
        this.element = element;
        this.index = index;
        this.containerScroller = null; // Scrollama instance for the container
        this.slideScroller = null; // Scrollama instance for individual slides
        this.isInitialized = false;

        // Store configuration settings for scrollama
        this.containerConfig = {};
        this.slideConfig = {};

        // Add unique class for targeting this specific section
        this.element.classList.add(`SA_scrolltelling-section-${index}`);

        this.init();
    }

    /**
     * Initializes the scroll container by setting up padding and scrollers
     */
    init() {
        this.setupPadding();
        this.setupContainerScroller();
        this.setupSlideScroller();
        this.isInitialized = true;
    }

    /**
     * Sets up padding at the bottom of the container
     * This ensures the last slide can scroll to the trigger point
     */
    setupPadding() {
        // Remove existing padding if present
        if (exists(this.element.querySelector(".SA_scrollypadding"))) {
            this.element.querySelector(".SA_scrollypadding").remove();
        }

        // Create new padding element
        let scrollyTellingPadding = newElement('div', {
            className: 'SA_scrollypadding'
        });
        
        const lastElementHeight = this.element.lastElementChild.querySelector(".SA_scroll-text").offsetHeight;
        
        // Set padding to 50vh + 2px (border adjustment)
        scrollyTellingPadding.style.height = (window.innerHeight * 0.5) + 2 + "px";
        this.element.appendChild(scrollyTellingPadding);
    }

    /**
     * Sets up the scrollama instance for the overall container
     * This tracks when the entire scrollytelling section enters/exits viewport
     */
    setupContainerScroller() {
        // Check if container needs progress tracking (for snapping or custom callbacks)
        const containerHasProgress = this.element.classList.contains('SA_scrollytelling-wrapper--snap') ||
            this.element.hasAttribute("data-on-progress");

        // Calculate midpoint of viewport
        // Using initial viewport height prevents jumpiness when URL bar changes on mobile
        var midpoint = Math.floor(window.innerHeight * 0.5) + "px";

        // Configure scrollama for the container
        this.containerConfig = {
            step: '.SA_scrollytelling-wrapper',
            progress: containerHasProgress, // Enable progress tracking if needed
            offset: midpoint, // Trigger point (50% down viewport)
            debug: this.containerConfig.debug || false // Preserve debug state
        };

        // Initialize scrollama and bind event handlers
        this.containerScroller = scrollama();
        this.containerScroller
            .setup(this.containerConfig)
            .onStepProgress(this.handleStepProgress.bind(this))
            .onStepEnter(this.handleStepEnter.bind(this))
            .onStepExit(this.handleStepExit.bind(this));
    }

    /**
     * Sets up the scrollama instance for individual slides within the container
     * Each slide can trigger different image reveals and callbacks
     */
    setupSlideScroller() {
        const slides = this.element.querySelectorAll('.SA_scrollytelling-slide');
        let hasProgress = false;

        // Process each slide
        for (let slide of slides) {
            // Normalize padding by reading computed values and re-applying them
            // This ensures consistent padding across browsers
            var slideTextWrapper = slide.querySelector(".SA_scroll-text-wrapper");
            slideTextWrapper.style.padding = '';
            var computedStyle = window.getComputedStyle(slideTextWrapper, null);
            var paddingTop = computedStyle.getPropertyValue('padding-top');
            var paddingBottom = computedStyle.getPropertyValue('padding-bottom');
            var paddingLeft = computedStyle.getPropertyValue('padding-left');
            var paddingRight = computedStyle.getPropertyValue('padding-right');
            slideTextWrapper.style.padding = `${paddingTop} ${paddingRight} ${paddingBottom} ${paddingLeft}`;

            // Check if any slide needs progress tracking
            // Note: This sets progress to true for ALL slides if any one has data-on-progress
            // TODO: Consider enabling progress tracking per-slide instead
            if (slide.hasAttribute("data-on-progress")) {
                hasProgress = true;
                break;
            }
        }

        // Create selector for slides in this specific section
        const stepEl = `.SA_scrolltelling-section-${this.index} .SA_scrollytelling-slide`;

        // Calculate midpoint of viewport
        // Using initial viewport height prevents jumpiness when URL bar changes on mobile
        var midpoint = Math.floor(window.innerHeight * 0.5) + "px";
        console.log(midpoint)

        // Configure scrollama for individual slides
        this.slideConfig = {
            step: stepEl,
            progress: hasProgress, // Enable progress tracking if any slide needs it
            offset: midpoint, // Trigger point (50% down viewport)
            debug: this.slideConfig.debug || false // Preserve debug state
        };

        // Initialize scrollama and bind event handlers
        this.slideScroller = scrollama();
        this.slideScroller
            .setup(this.slideConfig)
            .onStepProgress(this.handleStepProgress.bind(this))
            .onStepEnter(this.handleStepEnter.bind(this))
            .onStepExit(this.handleStepExit.bind(this));
    }

    /**
     * Handles scroll progress events for steps
     * Manages scroll snapping behavior and executes custom progress callbacks
     * 
     * @param {Object} response - Scrollama response object with progress and direction
     */
    handleStepProgress(response) {
        // Handle scroll snapping behavior for snap-enabled sections
        if (response.element.classList.contains('SA_scrollytelling-wrapper--snap')) {
            var snapElementHeight = getHeight(response.element)
            
            // Calculate when to enable/disable snapping based on scroll position
            var enterSnapPercent = ((window.innerHeight * 0.4) / snapElementHeight);
            var exitSnapPercent = ((window.innerHeight * 1) / snapElementHeight);

            // Scrolling down: enable snapping after entering the section
            if (response.progress > enterSnapPercent && response.progress < exitSnapPercent && response.direction == "down") {
                response.element.classList.add("SA_scrollytelling-wrapper--snap-active")
                enableSnapping();
            } 
            // Scrolling up: disable snapping when near the top
            else if (response.progress < exitSnapPercent && response.direction == "up") {
                response.element.classList.remove("SA_scrollytelling-wrapper--snap-active")
                disableSnapping();
            } 
            // Scrolling up: enable snapping when near the bottom
            else if (response.progress > 1 - exitSnapPercent && response.direction == "up") {
                response.element.classList.add("SA_scrollytelling-wrapper--snap-active")
                enableSnapping();
            } 
            // Scrolling down: disable snapping when exiting the section
            else if (response.progress > 1 - exitSnapPercent && response.direction == "down") {
                response.element.classList.remove("SA_scrollytelling-wrapper--snap-active")
                disableSnapping();
            } 
            // Middle of section: ensure snapping is active
            else if (response.progress > enterSnapPercent && response.progress < 1 - exitSnapPercent) {
                response.element.classList.add("SA_scrollytelling-wrapper--snap-active")
                enableSnapping();
            }
        }

        // Execute custom progress callback if defined
        if (response.element.hasAttribute("data-on-progress")) {
            var callbackFunction = response.element.getAttribute('data-on-progress');
            var args = callbackFunction.split(",").map(item => item.trim());
            if (!exists(window[args[0]])) {
                throw new Error("The function you are trying to call does not exist");
            }
            args.push(response);
            return executeFunctionByName.apply(null, args);
        }
    }

    /**
     * Handles step enter events
     * Reveals the corresponding sticky image and executes custom enter callbacks
     * 
     * @param {Object} response - Scrollama response object with element and index
     */
    handleStepEnter(response) {
        let container = response.element.parentNode.querySelector('.SA_scrollytelling-images');
        var images = container.querySelectorAll('.SA_fullscreen-image');

        // If only one image, keep it active throughout
        if (images.length == 1) {
            images[0].classList.add("SA_active-slide");
        } 
        // Multiple images: show the one corresponding to the current slide
        else if (exists(images[response.index])) {
            // Remove active class from all images
            images.forEach(el => {
                el.classList.remove("SA_active-slide");
            });

            // Add active class to current slide's image
            if (response.element.classList.contains('SA_scrollytelling-slide')) {
                images[response.index].classList.add("SA_active-slide");
            }
        }

        // Execute custom enter callback if defined
        if (response.element.hasAttribute("data-on-enter")) {
            var callbackFunction = response.element.getAttribute('data-on-enter');
            var args = callbackFunction.split(",").map(item => item.trim());
            if (!exists(window[args[0]])) {
                throw new Error("The function you are trying to call does not exist");
            }
            args.push(response);
            return executeFunctionByName.apply(null, args);
        }
    }

    /**
     * Handles step exit events
     * Hides images when slides exit the viewport
     * Includes special handling for scroll-in wrappers and single-image sections
     * 
     * @param {Object} response - Scrollama response object with element, index, and direction
     */
    handleStepExit(response) {
        let container = response.element.parentNode.querySelector('.SA_scrollytelling-images');
        let wrapper = container.parentNode;
        var images = container.querySelectorAll('.SA_fullscreen-image');

        // Handle multi-image sections
        if (exists(images[response.index]) && images.length != 1 && response.index != images.length - 1) {
            // Not the last image
            if (images[response.index] != images[images.length - 1]) {
                images[response.index].classList.remove("SA_active-slide");
            } 
            // Last image - special handling for scroll-in wrappers
            else {
                if (wrapper.classList.contains("SA_scrollytelling-wrapper--scroll-in")) {
                    if (response.index == images.length - 1) {
                        if (response.direction == "up") {
                            images[response.index].classList.remove("SA_active-slide");
                        }
                    } else {
                        images[response.index].classList.remove("SA_active-slide");
                    }
                } else {
                    images[response.index].classList.remove("SA_active-slide");
                }
            }
        } 
        // Handle single-image sections
        else if (response.direction == "down" && images.length == 1 && response.index == wrapper.querySelectorAll('.SA_scrollytelling-slide').length - 1 || response.index == 0 && response.direction == "up") {
            images[0].classList.remove("SA_active-slide");
        }

        // Execute custom exit callback if defined
        if (response.element.hasAttribute("data-on-exit")) {
            var callbackFunction = response.element.getAttribute('data-on-exit');
            var args = callbackFunction.split(",").map(item => item.trim());
            if (!exists(window[args[0]])) {
                throw new Error("The function you are trying to call does not exist");
            }
            args.push(response);
            return executeFunctionByName.apply(null, args);
        }
    }

    /**
     * Returns a copy of the container configuration
     * @returns {Object} Container scrollama configuration
     */
    getContainerConfig() {
        return {
            ...this.containerConfig
        };
    }

    /**
     * Returns a copy of the slide configuration
     * @returns {Object} Slide scrollama configuration
     */
    getSlideConfig() {
        return {
            ...this.slideConfig
        };
    }

    /**
     * Returns comprehensive debug information about this container
     * @returns {Object} Debug information including configs, state, and element counts
     */
    getDebugInfo() {
        return {
            element: this.element,
            index: this.index,
            isInitialized: this.isInitialized,
            containerConfig: {
                ...this.containerConfig
            },
            slideConfig: {
                ...this.slideConfig
            },
            hasContainerScroller: !!this.containerScroller,
            hasSlideScroller: !!this.slideScroller,
            slideCount: this.element.querySelectorAll('.SA_scrollytelling-slide').length,
            imageCount: this.element.querySelectorAll('.SA_fullscreen-image').length
        };
    }

    /**
     * Destroys scrollama instances and cleans up
     */
    destroy() {
        if (this.containerScroller) {
            this.containerScroller.destroy();
            this.containerScroller = null;
        }
        if (this.slideScroller) {
            this.slideScroller.destroy();
            this.slideScroller = null;
        }
        this.isInitialized = false;
    }

    /**
     * Destroys and reinitializes the container
     * Useful after configuration changes
     */
    reinitialize() {
        this.destroy();
        this.init();
    }

    /**
     * Triggers a resize on all scrollama instances
     * Called when window dimensions change
     */
    resize() {
        console.log("resize")
        this.containerScroller.resize();
        this.slideScroller.resize();
    }
}

/* ================================================================
   ANIMATEONENTER CLASS
   Handles scroll-triggered animations for individual elements
   ================================================================ */

/**
 * AnimateOnEnter Class
 * Manages elements that animate when they enter the viewport
 * Adds 'SA_active' class when scrolling down, removes it when scrolling up
 */
class AnimateOnEnter {
    /**
     * @param {HTMLElement} element - The element to animate on scroll
     */
    constructor(element) {
        this.element = element;
        this.scroller = null; // Scrollama instance
        this.config = {}; // Scrollama configuration
        this.init();
    }

    /**
     * Initializes the scrollama instance for this animate element
     */
    init() {
        const hasProgress = this.element.hasAttribute("data-on-progress");

        // Configure scrollama
        this.config = {
            step: '.SA_animate',
            progress: hasProgress, // Enable progress tracking if needed
            debug: this.config.debug || false, // Preserve debug state
            offset: 0.6 // Trigger when element is 60% down viewport
        };

        // Initialize scrollama and bind event handlers
        this.scroller = scrollama();
        this.scroller
            .setup(this.config)
            .onStepEnter(this.handleEnter.bind(this))
            .onStepProgress(this.handleProgress.bind(this))
            .onStepExit(this.handleExit.bind(this));
    }

    /**
     * Handles scroll progress events
     * Executes custom progress callbacks
     * 
     * @param {Object} response - Scrollama response object
     */
    handleProgress(response) {
        if (response.element.hasAttribute("data-on-progress")) {
            var callbackFunction = response.element.getAttribute('data-on-progress');
            var args = callbackFunction.split(",").map(item => item.trim());
            if (!exists(window[args[0]])) {
                throw new Error("The function you are trying to call does not exist");
            }
            args.push(response);
            return executeFunctionByName.apply(null, args);
        }
    }

    /**
     * Handles enter events when scrolling down
     * Adds active class and executes custom enter callbacks
     * 
     * @param {Object} response - Scrollama response object
     */
    handleEnter(response) {
        if (response.direction == "down") {
            // Execute custom enter callback if defined
            if (response.element.hasAttribute("data-on-enter")) {
                var callbackFunction = response.element.getAttribute('data-on-enter');
                var args = callbackFunction.split(",").map(item => item.trim());
                if (!exists(window[args[0]])) {
                    throw new Error("The function you are trying to call does not exist");
                }
                args.push(response);
                return executeFunctionByName.apply(null, args);
            }
            // Add active class to trigger CSS animations
            response.element.classList.add("SA_active");
        }
    }

    /**
     * Handles exit events when scrolling up
     * Removes active class and executes custom exit callbacks
     * 
     * @param {Object} response - Scrollama response object
     */
    handleExit(response) {
        if (response.direction == "up") {
            // Execute custom exit callback if defined
            if (response.element.hasAttribute("data-on-exit")) {
                var callbackFunction = response.element.getAttribute('data-on-exit');
                var args = callbackFunction.split(",").map(item => item.trim());
                if (!exists(window[args[0]])) {
                    throw new Error("The function you are trying to call does not exist");
                }
                args.push(response);
                return executeFunctionByName.apply(null, args);
            }
            // Remove active class to reverse CSS animations
            response.element.classList.remove("SA_active");
        }
    }

    /**
     * Checks if the element is already in viewport on page load
     * Adds active class if element is visible
     */
    checkPosition() {
        var elOffset = this.element.getBoundingClientRect().top + window.pageYOffset;

        if (elOffset < window.pageYOffset + window.innerHeight && elOffset > 0) {
            this.element.classList.add("SA_active");
        }
    }

    /**
     * Returns a copy of the configuration
     * @returns {Object} Scrollama configuration
     */
    getConfig() {
        return {
            ...this.config
        };
    }

    /**
     * Returns comprehensive debug information
     * @returns {Object} Debug information including state and callbacks
     */
    getDebugInfo() {
        return {
            element: this.element,
            config: {
                ...this.config
            },
            hasScroller: !!this.scroller,
            isActive: this.element.classList.contains('SA_active'),
            hasDataOnEnter: this.element.hasAttribute("data-on-enter"),
            hasDataOnExit: this.element.hasAttribute("data-on-exit"),
            hasDataOnProgress: this.element.hasAttribute("data-on-progress")
        };
    }

    /**
     * Destroys the scrollama instance and cleans up
     */
    destroy() {
        if (this.scroller) {
            this.scroller.destroy();
            this.scroller = null;
        }
    }

    /**
     * Destroys and reinitializes the element
     * Useful after configuration changes
     */
    reinitialize() {
        this.destroy();
        this.init();
    }
}

/* ================================================================
   SCROLLYTELLINGMANAGER CLASS
   Coordinates all scroll behavior across the page
   ================================================================ */

/**
 * ScrollytellingManager Class
 * Central manager that initializes and coordinates all scrollytelling elements
 * Maintains references to all ScrollContainers and AnimateOnEnter instances
 */
class ScrollytellingManager {
    constructor() {
        this.scrollContainers = new Map(); // Map of elements to ScrollContainer instances
        this.animateElements = new Map(); // Map of elements to AnimateOnEnter instances
    }

    /**
     * Initializes all scrollytelling elements on the page
     * Finds and sets up all scroll containers and animate elements
     */
    init() {
        // Initialize scroll containers (scrollytelling sections)
        const scrollContainerElements = document.querySelectorAll('.SA_scrollytelling-wrapper');
        scrollContainerElements.forEach((element, index) => {
            const container = new ScrollContainer(element, index);
            this.scrollContainers.set(element, container);
        });

        // Initialize animate elements (scroll-triggered animations)
        const animateElements = document.querySelectorAll('.SA_animate');
        animateElements.forEach(element => {
            const animator = new AnimateOnEnter(element);
            this.animateElements.set(element, animator);
        });

        // Check if any elements are already in viewport on load
        this.checkAllContainerPositions();
    }

    /**
     * Checks initial viewport positions for all animate elements
     * Ensures elements already visible on page load get the active class
     */
    checkAllContainerPositions() {
        this.animateElements.forEach(animator => {
            animator.checkPosition();
        });
    }

    /**
     * Handles window resize events
     * Updates all scroll containers and recalculates global dimensions
     */
    onResize() {
        // Trigger resize on all scroll containers
        this.scrollContainers.forEach(container => container.resize());

        // Recalculate window height
        windowHeight = Math.max(
            document.body.scrollHeight, document.documentElement.scrollHeight,
            document.body.offsetHeight, document.documentElement.offsetHeight,
            document.body.clientHeight, document.documentElement.clientHeight
        );

        // Optional: Reinitialize on width change (currently disabled)
        // if (windowWidth != window.innerWidth) {
        //     this.scrollContainers.forEach(container => container.reinitialize());
        //     this.animateElements.forEach(animator => animator.reinitialize());
        // }

        // Update global dimension variables
        windowWidth = window.innerWidth;
        mobile = windowWidth <= 600;
    }

    /**
     * Enables all scrollytelling elements
     * Activates scroll listeners for all containers and animate elements
     */
    enableAllElements() {
        this.scrollContainers.forEach(container => {
            if (container.containerScroller) {
                container.containerScroller.enable();
            }
            if (container.slideScroller) {
                container.slideScroller.enable();
            }
        });
        
        this.animateElements.forEach(animator => {
            if (animator.scroller) {
                animator.scroller.enable();
            }
        });
        
        console.log('All scrollytelling elements enabled');
    }

    /**
     * Disables all scrollytelling elements
     * Deactivates scroll listeners for all containers and animate elements
     */
    disableAllElements() {
        this.scrollContainers.forEach(container => {
            if (container.containerScroller) {
                container.containerScroller.disable();
            }
            if (container.slideScroller) {
                container.slideScroller.disable();
            }
        });
        
        this.animateElements.forEach(animator => {
            if (animator.scroller) {
                animator.scroller.disable();
            }
        });
        
        console.log('All scrollytelling elements disabled');
    }

    /**
     * Gets a ScrollContainer instance by element
     * @param {HTMLElement} element - The wrapper element
     * @returns {ScrollContainer|undefined} The container instance
     */
    getScrollContainer(element) {
        return this.scrollContainers.get(element);
    }

    /**
     * Gets an AnimateOnEnter instance by element
     * @param {HTMLElement} element - The animate element
     * @returns {AnimateOnEnter|undefined} The animator instance
     */
    getAnimateElement(element) {
        return this.animateElements.get(element);
    }

    /**
     * Gets configuration for a specific element
     * @param {HTMLElement} element - The element to get config for
     * @returns {Object|null} Debug information or null if not found
     */
    getElementConfig(element) {
        const scrollContainer = this.scrollContainers.get(element);
        const animateElement = this.animateElements.get(element);

        if (scrollContainer) {
            return scrollContainer.getDebugInfo();
        } else if (animateElement) {
            return animateElement.getDebugInfo();
        } else {
            return null;
        }
    }

    /**
     * Gets all configurations for all managed elements
     * @returns {Object} Object with arrays of all container and element configs
     */
    getAllConfigs() {
        const configs = {
            scrollContainers: [],
            animateElements: []
        };

        this.scrollContainers.forEach((container, element) => {
            configs.scrollContainers.push(container.getDebugInfo());
        });

        this.animateElements.forEach((animator, element) => {
            configs.animateElements.push(animator.getDebugInfo());
        });

        return configs;
    }

    /**
     * Enables debug mode for all scrollers
     * Shows visual indicators for scroll trigger points
     * @returns {string} Success message
     */
    enableDebugMode() {
        // Remove any existing debug indicators
        window.document.body
            .querySelectorAll('.scrollama__debug-step')
            .forEach(el => el.remove())

        // Enable debug for all containers
        this.scrollContainers.forEach(container => {
            container.containerConfig.debug = true;
            container.slideConfig.debug = true;
            container.reinitialize();
        });

        // Enable debug for all animate elements
        this.animateElements.forEach(animator => {
            animator.config.debug = true;
            animator.reinitialize();
        });

        return 'Debug mode enabled for all scrollers';
    }

    /**
     * Disables debug mode for all scrollers
     * Removes visual debug indicators
     */
    disableDebugMode() {
        // Remove all debug indicators
        window.document.body
            .querySelectorAll('.scrollama__debug-step')
            .forEach(el => el.remove())

        // Disable debug for all containers
        this.scrollContainers.forEach(container => {
            container.containerConfig.debug = false;
            container.slideConfig.debug = false;
            container.reinitialize();
        });

        // Disable debug for all animate elements
        this.animateElements.forEach(animator => {
            animator.config.debug = false;
            animator.reinitialize();
        });

        console.log('Debug mode disabled for all scrollers');
    }

    /**
     * Enables debug mode for a specific element
     * @param {string} selector - CSS selector for the element
     * @returns {boolean} Success status
     */
    enableDebugForElement(selector) {
        // Remove existing debug indicators
        window.document.body
            .querySelectorAll('.scrollama__debug-step')
            .forEach(el => el.remove())

        const element = document.querySelector(selector);
        if (!element) {
            console.warn(`Element not found: ${selector}`);
            return false;
        }

        const scrollContainer = this.scrollContainers.get(element);
        const animateElement = this.animateElements.get(element);

        if (scrollContainer) {
            scrollContainer.containerConfig.debug = true;
            scrollContainer.slideConfig.debug = true;
            scrollContainer.reinitialize();
            console.log(`Debug enabled for scroll container: ${selector}`);
            return true;
        } else if (animateElement) {
            animateElement.config.debug = true;
            animateElement.reinitialize();
            console.log(`Debug enabled for animate element: ${selector}`);
            return true;
        } else {
            console.warn(`Element found but not managed by scrollytelling system: ${selector}`);
            return false;
        }
    }

    /**
     * Disables debug mode for a specific element
     * @param {string} selector - CSS selector for the element
     * @returns {boolean} Success status
     */
    disableDebugForElement(selector) {
        // Remove existing debug indicators
        window.document.body
            .querySelectorAll('.scrollama__debug-step')
            .forEach(el => el.remove())

        const element = document.querySelector(selector);
        if (!element) {
            console.warn(`Element not found: ${selector}`);
            return false;
        }

        const scrollContainer = this.scrollContainers.get(element);
        const animateElement = this.animateElements.get(element);

        if (scrollContainer) {
            scrollContainer.containerConfig.debug = false;
            scrollContainer.slideConfig.debug = false;
            scrollContainer.reinitialize();
            console.log(`Debug disabled for scroll container: ${selector}`);
            return true;
        } else if (animateElement) {
            animateElement.config.debug = false;
            animateElement.reinitialize();
            console.log(`Debug disabled for animate element: ${selector}`);
            return true;
        } else {
            console.warn(`Element found but not managed by scrollytelling system: ${selector}`);
            return false;
        }
    }

    /**
     * Enables debug mode for a specific scroll container by index
     * @param {number} index - Container index (0-based)
     * @returns {boolean} Success status
     */
    enableDebugForContainer(index) {
        // Remove existing debug indicators
        window.document.body
            .querySelectorAll('.scrollama__debug-step')
            .forEach(el => el.remove())

        const containers = Array.from(this.scrollContainers.values());
        if (index < 0 || index >= containers.length) {
            console.warn(`Container index out of range: ${index}. Valid range: 0-${containers.length - 1}`);
            return false;
        }

        const container = containers[index];
        container.containerConfig.debug = true;
        container.slideConfig.debug = true;
        container.reinitialize();
        console.log(`Debug enabled for scroll container at index: ${index}`);
        return true;
    }

    /**
     * Disables debug mode for a specific scroll container by index
     * @param {number} index - Container index (0-based)
     * @returns {boolean} Success status
     */
    disableDebugForContainer(index) {
        // Remove existing debug indicators
        window.document.body
            .querySelectorAll('.scrollama__debug-step')
            .forEach(el => el.remove())

        const containers = Array.from(this.scrollContainers.values());
        if (index < 0 || index >= containers.length) {
            console.warn(`Container index out of range: ${index}. Valid range: 0-${containers.length - 1}`);
            return false;
        }

        const container = containers[index];
        container.containerConfig.debug = false;
        container.slideConfig.debug = false;
        container.reinitialize();
        console.log(`Debug disabled for scroll container at index: ${index}`);
        return true;
    }

    /**
     * Gets summary statistics about managed elements
     * @returns {Object} Summary with counts and initialization status
     */
    getSummary() {
        return {
            totalScrollContainers: this.scrollContainers.size,
            totalAnimateElements: this.animateElements.size,
            initialized: true
        };
    }
}

/* ================================================================
   GLOBAL MANAGER INSTANCE
   ================================================================ */

// Create the global scrollytelling manager instance
const scrollytellingManager = new ScrollytellingManager();

/* ================================================================
   DEBUG UTILITIES
   Browser console tools for troubleshooting scrollytelling
   ================================================================ */

/**
 * Global debug object for browser console access
 * Usage: Type 'debugScrollytelling.help()' in the console
 */
window.debugScrollytelling = {
    manager: scrollytellingManager,

    /**
     * Gets configuration for an element by selector
     * @param {string} selector - CSS selector
     * @returns {Object|null} Element configuration
     */
    getConfig: (selector) => {
        const element = document.querySelector(selector);
        if (!element) {
            console.warn(`Element not found: ${selector}`);
            return null;
        }
        return scrollytellingManager.getElementConfig(element);
    },

    /** Enables debug mode for all scrollers */
    enableDebug: () => scrollytellingManager.enableDebugMode(),
    
    /** Disables debug mode for all scrollers */
    disableDebug: () => scrollytellingManager.disableDebugMode(),

    /** Enables debug for a specific element */
    enableDebugForElement: (selector) => scrollytellingManager.enableDebugForElement(selector),
    
    /** Disables debug for a specific element */
    disableDebugForElement: (selector) => scrollytellingManager.disableDebugForElement(selector),
    
    /** Enables debug for a container by index */
    enableDebugForContainer: (index) => scrollytellingManager.enableDebugForContainer(index),
    
    /** Disables debug for a container by index */
    disableDebugForContainer: (index) => scrollytellingManager.disableDebugForContainer(index),

    /** Gets all element configurations */
    getAllConfigs: () => scrollytellingManager.getAllConfigs(),

    /** Gets summary statistics */
    getSummary: () => scrollytellingManager.getSummary(),

    /**
     * Lists all elements being managed by the scrollytelling system
     * @returns {Object} Object with arrays of managed elements
     */
    listElements: () => {
        const scrollContainers = Array.from(scrollytellingManager.scrollContainers.keys());
        const animateElements = Array.from(scrollytellingManager.animateElements.keys());

        console.log('=== Managed Elements ===');
        console.log(`Scroll Containers (${scrollContainers.length}):`, scrollContainers);
        console.log(`Animate Elements (${animateElements.length}):`, animateElements);

        if (scrollContainers.length === 0 && animateElements.length === 0) {
            console.warn('No elements found! This could mean:');
            console.warn('1. The page hasn\'t finished initializing yet');
            console.warn('2. No .SA_scrollytelling-wrapper or .SA_animate elements exist on the page');
            console.warn('3. Try calling this after the page loads');
        }

        return {
            scrollContainers: scrollContainers,
            animateElements: animateElements,
            total: scrollContainers.length + animateElements.length
        };
    },

    /**
     * Checks a specific element by selector
     * Displays configuration in table format
     * @param {string} selector - CSS selector
     * @returns {Object|null} Element configuration
     */
    checkElement: (selector) => {
        const element = document.querySelector(selector);
        if (!element) {
            console.warn(`Element not found: ${selector}`);
            return null;
        }

        const config = scrollytellingManager.getElementConfig(element);
        if (config) {
            console.table(config);
        } else {
            console.log('Element is not managed by scrollytelling system');
        }
        return config;
    },

    /**
     * Gets a container by its index
     * @param {number} index - Container index (0-based)
     * @returns {Object|null} Container debug info
     */
    getContainerByIndex: (index) => {
        const containers = Array.from(scrollytellingManager.scrollContainers.values());
        return containers[index] ? containers[index].getDebugInfo() : null;
    },

    /**
     * Displays help information for debug utilities
     * @returns {string} Help text with all available methods
     */
    help: () => {
        const helpText = `
=== Scrollytelling Debug Utilities ===

debugScrollytelling.getConfig(selector)        - Get config for element
debugScrollytelling.checkElement(selector)     - Check element details (table format)
debugScrollytelling.enableDebug()             - Enable debug mode for all
debugScrollytelling.disableDebug()            - Disable debug mode for all
debugScrollytelling.enableDebugForElement(sel) - Enable debug for specific element
debugScrollytelling.disableDebugForElement(sel)- Disable debug for specific element
debugScrollytelling.enableDebugForContainer(i) - Enable debug for container by index
debugScrollytelling.disableDebugForContainer(i)- Disable debug for container by index
debugScrollytelling.getAllConfigs()           - Get all configurations
debugScrollytelling.getSummary()              - Get summary statistics
debugScrollytelling.listElements()            - List all managed elements
debugScrollytelling.getContainerByIndex(i)    - Get container by index
debugScrollytelling.checkDOMElements()        - Check what elements exist in DOM
debugScrollytelling.isInitialized()           - Check if manager is initialized
debugScrollytelling.help()                    - Show this help

=== Examples ===
debugScrollytelling.getConfig(".SA_scrollytelling-wrapper")
debugScrollytelling.checkElement(".SA_animate")
debugScrollytelling.enableDebug()                                    // Enable all
debugScrollytelling.enableDebugForElement(".SA_scrollytelling-wrapper") // Specific element
debugScrollytelling.enableDebugForContainer(0)                       // First container
`;

        return helpText;
    },

    /**
     * Checks what elements exist in the DOM
     * Useful for verifying elements are present before initialization
     * @returns {Object} Object with arrays of found elements
     */
    checkDOMElements: () => {
        const scrollWrappers = document.querySelectorAll('.SA_scrollytelling-wrapper');
        const animateElements = document.querySelectorAll('.SA_animate');

        console.log('=== DOM Elements Check ===');
        console.log(`Found ${scrollWrappers.length} .SA_scrollytelling-wrapper elements:`, scrollWrappers);
        console.log(`Found ${animateElements.length} .SA_animate elements:`, animateElements);

        return {
            scrollWrappers: Array.from(scrollWrappers),
            animateElements: Array.from(animateElements),
            total: scrollWrappers.length + animateElements.length
        };
    },

    /**
     * Checks if the manager is initialized
     * Displays counts of managed elements
     * @returns {boolean} Initialization status
     */
    isInitialized: () => {
        const initialized = scrollytellingManager.scrollContainers.size > 0 || scrollytellingManager.animateElements.size > 0;
        console.log('Manager initialized:', initialized);
        console.log('Scroll containers:', scrollytellingManager.scrollContainers.size);
        console.log('Animate elements:', scrollytellingManager.animateElements.size);
        return initialized;
    }
};

// Log that debug utilities are available
console.log('Scrollytelling debug utilities loaded. Type debugScrollytelling.help() for usage.');

/* ================================================================
   RESIZE HANDLING
   ================================================================ */

// Legacy resize handler (currently unused)
// function onResize() {
//     scrollytellingManager.onResize();
// }

// var resize;
// window.onresize = function() {
//     clearTimeout(resize);
//     resize = setTimeout(onResize, 300);
// };

/**
 * Debounced resize handler
 * Re-enables all elements and recalculates dimensions
 * Debounced to prevent excessive calls during resize
 */
var debouncedResize = debounce(function() {
    scrollytellingManager.enableAllElements();
    scrollytellingManager.onResize();
}, 250);

/**
 * Mobile viewport resize handler
 * Handles the resize event triggered by URL bar showing/hiding on mobile
 * Uses visualViewport API for more accurate mobile viewport tracking
 */
if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', () => {
        scrollytellingManager.onResize();
    });
}

/* ================================================================
   PAGE INITIALIZATION
   ================================================================ */

/**
 * Initializes the scrollytelling system
 * Called after DOM is ready with a small delay to ensure all elements are rendered
 */
function startPage() {
    window.setTimeout(function() {
        scrollytellingManager.init();
        debugScrollytelling.help()
    }, 100);
}

/* ================================================================
   PERFORMANCE UTILITIES
   ================================================================ */

/**
 * Throttle function
 * Limits how often a function can be called
 * Executes immediately, then blocks subsequent calls until limit expires
 * 
 * @param {Function} callback - The function to throttle
 * @param {number} limit - Minimum time between calls in milliseconds
 * @returns {Function} Throttled function
 */
function throttle(callback, limit) {
    var waiting = false;
    return function() {
        if (!waiting) {
            callback.apply(this, arguments);
            waiting = true;
            setTimeout(function() {
                waiting = false;
            }, limit);
        }
    }
}

/**
 * Debounce function
 * Delays function execution until after a period of inactivity
 * Resets the timer if called again before delay expires
 * 
 * @param {Function} callback - The function to debounce
 * @param {number} delay - Time to wait in milliseconds
 * @returns {Function} Debounced function
 */
function debounce(callback, delay) {
    var timeoutId;
    return function() {
        var context = this;
        var args = arguments;
        clearTimeout(timeoutId);
        timeoutId = setTimeout(function() {
            callback.apply(context, args);
        }, delay);
    }
}

/* ================================================================
   DOCUMENT READY
   Cross-browser document ready implementation
   ================================================================ */

if (document.readyState != 'loading') startPage();
else if (document.addEventListener) document.addEventListener('DOMContentLoaded', startPage);
else document.attachEvent('onreadystatechange', function() {
    if (document.readyState == 'complete') startPage();
});

/* ================================================================
   HELPER FUNCTIONS
   General utility functions for DOM manipulation and calculations
   ================================================================ */

/**
 * Translates a number from one range to another
 * @param {number} number - The number to translate
 * @param {number} fromStart - Start of original range
 * @param {number} fromEnd - End of original range
 * @param {number} toStart - Start of target range
 * @param {number} toEnd - End of target range
 * @returns {number} Translated number
 */
function translateRange(number, fromStart, fromEnd, toStart, toEnd) {
    return (number - fromStart) * ((toEnd - toStart) / (fromEnd - fromStart)) + toStart
}

/**
 * Formats a number with comma separators
 * @param {number|string} element - The number to format
 * @returns {string} Formatted number string
 */
function numberWithCommas(element) {
    return element.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * Generates a random number between min and max
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Random number
 */
function getRandom(min, max) {
    return Math.random() * (max - min) + min;
}

/**
 * Makes an AJAX GET request
 * @param {string} url - URL to request
 * @param {Function} successFunction - Callback function for successful response
 */
function ajaxRequest(url, successFunction) {
    var request = new XMLHttpRequest();
    request.open('GET', url, true);
    request.onload = function() {
        if (this.status >= 200 && this.status < 400) {
            var resp = this.response;
            successFunction(resp)
        }
    };
    request.onerror = function() {};
    request.send();
}

/**
 * Gets the computed height of an element in pixels
 * @param {HTMLElement} element - The element to measure
 * @returns {number} Height in pixels
 */
function getHeight(element) {
    return parseFloat(getComputedStyle(element, null).height.replace("px", ""))
}

/**
 * Gets the computed width of an element in pixels
 * @param {HTMLElement} element - The element to measure
 * @returns {number} Width in pixels
 */
function getWidth(element) {
    return parseFloat(getComputedStyle(element, null).width.replace("px", ""))
}

/**
 * Sets the height of an element
 * @param {HTMLElement} element - The element to modify
 * @param {number|string|Function} val - Height value (px number, CSS string, or function returning either)
 */
function setHeight(element, val) {
    if (typeof val === "function") val = val();
    if (typeof val === "string") element.style.height = val;
    else element.style.height = val + "px";
}

/**
 * Sets the width of an element
 * @param {HTMLElement} element - The element to modify
 * @param {number|string|Function} val - Width value (px number, CSS string, or function returning either)
 */
function setWidth(element, val) {
    if (typeof val === "function") val = val();
    if (typeof val === "string") element.style.width = val;
    else element.style.width = val + "px";
}

/**
 * Gets the offset from the top of the page
 * @param {HTMLElement} element - The element to measure
 * @returns {number} Offset in pixels
 */
function offsetTop(element) {
    var rect = element.getBoundingClientRect();
    return rect.bottom + window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
}

/**
 * Gets the offset from the left of the page
 * @param {HTMLElement} element - The element to measure
 * @returns {number} Offset in pixels
 */
function offsetLeft(element) {
    var rect = element.getBoundingClientRect();
    return rect.left + window.pageXOffset || document.documentElement.scrollLeft || document.body.scrollLeft || 0;
}

/**
 * Cross-browser element matching
 * @param {HTMLElement} element - The element to test
 * @param {string} selector - CSS selector to match against
 * @returns {boolean} True if element matches selector
 */
function matches(element, selector) {
    return (element.matches || element.matchesSelector || element.msMatchesSelector || element.mozMatchesSelector || element.webkitMatchesSelector || element.oMatchesSelector).call(element, selector);
}

/**
 * Checks if an element exists (is defined and not null)
 * @param {*} element - The element to check
 * @returns {boolean} True if element exists
 */
function exists(element) {
    if (typeof(element) != 'undefined' && element != null) {
        return true;
    } else {
        return false;
    }
}

/**
 * Executes a callback when DOM is ready
 * @param {Function} callback - Function to execute when ready
 */
function ready(callback) {
    if (document.readyState != 'loading') {
        callback();
    } else {
        document.addEventListener('DOMContentLoaded', callback);
    }
}

/**
 * Parses an HTML string into DOM elements
 * @param {string} str - HTML string to parse
 * @returns {HTMLCollection} Collection of parsed elements
 */
function parseHTML(str) {
    var tmp = document.implementation.createHTMLDocument();
    tmp.body.innerHTML = str;
    return tmp.body.children;
}

/**
 * Creates a new DOM element with attributes and children
 * @param {string} type - Element tag name
 * @param {Object} attr - Object with element attributes
 * @param {Array} children - Array of child elements
 * @returns {HTMLElement} Created element
 */
function newElement(type, attr, children) {
    var el = document.createElement(type);
    for (var n in attr) {
        if (n == 'style') {
            setStyle(el, attr[n]);
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

/**
 * Creates a new text node
 * @param {string} text - Text content
 * @returns {Text} Text node
 */
function newText(text) {
    var el = document.createTextNode(text);
    return el
}