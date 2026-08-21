# toronto-star-boilerplate-project
Boilerplate project for Toronto Star open template projects

###### Requirements ######

node v18.20.8

npm 6.14.13

npx 6.14.13

###### Getting Started ######

1.	Install gulp (requires node, npm, npx)
	https://gulpjs.com/docs/en/getting-started/quick-start

2. Switch to node `nvm use 18`

3.	Make sure the project path does not contain spaces (the install will stop with a clear error if it does). If needed, rename the folder before installing.

4.	Navigate to the main folder in terminal and run the following command
	`nvm use 18 && npm install --save-dev && gulp`

5. Update database if necessary `npx browserslist@latest --update-db`

5.	Open `gulpfile.js` and change the `projectPath` and `macroName` variable names to match your project. This is not required. It is only to make it easier for you whe you run `gulp buildLive`


###### Usage ######

	- make edits to files in the /app folder only
	- add images & video to the /img folder 
	- running gulp build will copy everything to the /dist folder compressing images, parsing sass and minifying+combining css/js in the process
	- the /dist folder contains your final project


###### Commands ######

`gulp build `
	- creates a build in the /dist folder
	- will delete all files and folders other than the /img folder before running
	- this means that new images will be proccess but if you made any changes to existing images they will not be copied over. To reprocess all the images again use gulp rebuild

`gulp rebuild`
	- same as gulp build but deletes the /img folder first and copies all the images over

`gulp buildLive`
	- Creates a build that you can copy directly into blox. It will add the blox macro code to the top of the document from `index-live.html`. Make sure you have set your `projectPath` and `macroName` in `gulpfile.js` or edit the `index.html` file in dist after running this.

`gulp buildDirect`
	- instead of proccessing and minifying js this just copys it. Usefull if you are getting js errors

`gulp purge`
	- use this as the last step after gulp build/rebuild if you want smaller css files
	- goes through the main.css file in /dist and removes all unused css
	- be careful when using this. It might sometimes remove css that you need. 
	- in gulpfile.js under the purge function there is a whitelist where you can add css classes that you don't want to be removed
	- always check that the page is still working properly at all breakpoints and especially for classes that are added via javascript

`gulp watch`
	- watches for changes in html, css, js and image files then updates a browser preview whenever a file is saved

`gulp`
	- a shortcut for gulp build


###### Notes ######

- You can put non-image files in the /img folder. They will be copied over without compression
- using fileinclude you can inject html files into other html files. This makes it easier to stay orgainized without having one large html file
- example:     
		<div id="chapter-1">@@include('./chapter1.html')</div>


###### Updating packages ######

Be careful this can break some dependacies (Currently autoprefixer v 10.0.0 doesn't work)

Use npm install -g npm-check-updates to install, then npm-check-updates to check if your dependencies have updates, and npm-check-updates -u to update your package.json versions. Then it's just npm install and it will download new versions.