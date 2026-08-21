# January 19, 2026

## Breaking Changes

### Node 18 Required
- **Node 18 Required:** This project now requires Node v18.20.8. To update, use `nvm use 18` on a per-project basis or set globally with `nvm alias default 18`

### Build Configuration
- **Updated Image CDN:** Changed live build image prefix to the new AWS server: `https://projects-images.thestar.com/{your-project-name}`

## Key Changes

### Image Loading
- **Simplified Picture Tags:** Picture tags are now much simplier. Just include the code below (replacing "milliken-park" with your image name) and it will automatically generate an srcset with multiple image sizes. If your image is a png change the .jpgs to .png and type="image/jpeg" to type="image/png". Leave the webp part as it is.
```html
<picture>
    <source data-src="images/milliken-park.webp" type="image/webp" />
    <source data-src="images/milliken-park.jpg" type="image/jpeg" />
    <img loading="lazy" data-src="images/milliken-park.jpg" alt="Alt tag" />
</picture>
```
- **Native Lazy Loading:** Now uses native browser `loading="lazy"` attribute instead of LazySizes library
- **LazySizes Retained:** LazySizes libraries remain in the `js` folder for optional use cases (e.g., video lazy loading), but must be manually added to `body.html` if needed

### SCSS Modernization
- **Migrated to `@use` from `@import`:** All SCSS files now use the modern `@use` module system with `as *` namespacing
- **Updated Division Syntax:** Replaced deprecated `/` division with `math.div()` function from `sass:math` module
- **Code Formatting:** Improved string concatenation spacing throughout SCSS files (e.g., `#{$var+ "px"}` instead of `#{$var+"px"}`)

### Code Cleanup
- **Removed Commented Code:** Cleaned up commented-out script tags from `body.html` (jQuery, LazySizes, debug indicators, FontAwesome)


# June 25, 2025

## Key Changes:

- **Eliminated Global Arrays:** Replaced `scrollContainersScrollers[]`, `scrollers[]`, and `onEnterElements[]` with Maps in the manager class
- **Class Encapsulation:** Each scroll container and animate element manages its own state and scrollama instances
- **Simplified Initialization:** `startPage()` now just calls `scrollytellingManager.init()`
- **Cleaner Resize Logic:** `onResize()` calls `reinitialize()` on each instance rather than complex array management
- **Direct Element-to-Instance Mapping:** Use Maps with DOM elements as keys instead of index-based lookups
- **Better Error Handling:** Each class validates its own state and handles errors appropriately

The refactored code maintains all existing functionality while providing better organization, easier maintenance, and cleaner state management.


## Debug Features Implemented

### 1. ScrollContainer Class Enhancements
- **Configuration Storage:** containerConfig and slideConfig objects store all setup parameters
- **Getter Methods:** getContainerConfig(), getSlideConfig(), and getDebugInfo()
- **Debug Info:** Includes element details, initialization status, scroller presence, slide/image counts

### 2. AnimateOnEnter Class Enhancements
- **Configuration Storage:** config object stores setup parameters
- **Getter Methods:** getConfig() and getDebugInfo()
- **Debug Info:** Includes element state, scroller status, and data attribute presence

### 3. ScrollytellingManager Debug Methods
- **getElementConfig(element)** - Get config for specific element
- **getAllConfigs()** - Get all configurations
- **enableDebugMode() / disableDebugMode()** - Toggle debug mode for all scrollers
- **getSummary()** - Get summary statistics

### 4. Global Debug Utilities (window.debugScrollytelling)

## How to Use
Open your browser console and use these commands:
```javascript
// Show help
debugScrollytelling.help()

// Check configuration of first scrollytelling wrapper
debugScrollytelling.getConfig('.SA_scrollytelling-wrapper')

// Check element details in table format
debugScrollytelling.checkElement('.SA_animate')

// Enable debug mode for all scrollers (shows visual indicators)
debugScrollytelling.enableDebug()

// List all managed elements
debugScrollytelling.listElements()

// Get summary statistics
debugScrollytelling.getSummary()

// Get all configurations
debugScrollytelling.getAllConfigs()

// Get specific container by index
debugScrollytelling.getContainerByIndex(0)
```