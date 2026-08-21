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