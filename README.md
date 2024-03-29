# Nav Generator

## What is it?

This application allow you to convert a list of bookmarks and urls into a self-contained data url that can be added to your browser bookmark. This application runs entirely on the client side and has no backend requirement.

As of right now, it only requires the static html to be hosted somewhere in the cloud. Right now for the demo, it's hosted on a github page.

## Demo

Follow this URL to create a new nav - https://synle.github.io/nav-generator/

## Deployment

You can deploy the nav to Github Pages. For a quick deployment, refer to this Github Template. https://github.com/synle/nav-generator

## Features

### Supported Components

- [x] Page Title (use `!`)
- [x] Link Button (use `|` pr `|||`)
- [x] Javascript Buttons
- [x] Link to other data url
- [x] Sections (use `#`)
- [x] Code Blocks
- [x] HTML Blocks (use `---`)
- [x] Tabs

### Other features

- [x] Download schema and bookmark
- [x] Quick copy to clipboard

## Syntax

### Page Title

```
! Page Title
```

### Buttons

#### Link Buttons

Open the link in the same tab with `|`

```
google finance | finance.google.com
```

Open the link in a different tab with `|||`

```
google finance ||| finance.google.com
```

#### Javascript Buttons

```
sample alert js | javascript://alert('hello')
```

#### Link to other data url

The application support linking directly to other data url bookmark generated by our application.

```
sample data url | data:text/html,%3Chtml%3E%0A%20%20%3Chead%3E%0A%20%20%20%20%3Cmeta%20charset%3D'utf-8'%20%2F%3E%0A%20%20%20%20%3Ctitle%3ELoading...%3C%2Ftitle%3E%0A%20%20%20%20%3Clink%20rel%3D%22stylesheet%22%20href%3D%22http%3A%2F%2Flocalhost%3A8080%2Findex.css%22%20%2F%3E%0A%20%20%3C%2Fhead%3E%0A%20%20%3Cload%20%2F%3E%0A%20%20%3Cscript%20type%3D'schema'%3E!%20Data%20Test%20Navigation%0A%0A%23%20Main%20Section%0Agoogle%7Cgoogle.com%3C%2Fscript%3E%0A%20%20%3Cscript%20src%3D'https%3A%2F%2Funpkg.com%2F%40babel%2Fstandalone%2Fbabel.min.js'%3E%3C%2Fscript%3E%0A%20%20%3Cscript%20src%3D'http%3A%2F%2Flocalhost%3A8080%2Findex.jsx'%20type%3D'text%2Fbabel'%20data-presets%3D'react'%20data-type%3D'module'%3E%3C%2Fscript%3E%0A%3C%2Fhtml%3E
```

### Section

Use `#` to indicate a section

```
# Main Link Section
```

### Code Block

Wrap it inside triple backticks.

````
```
TODO 1
TODO 2
```
````

### HTML Block

Wrap html block inside `---`

```
---blockId2
<u><b>sample html</b></u> blockId2
---
```

### Tabs

Tabs are supported. Here are an example:

````
>>>tabName1|blockId1>>>tabName2|blockId2

```blockId1
sample blockId1
```

---blockId2
<u><b>sample html</b></u> blockId2
---

````

## Guide

### Schema Markup

````

! Navigation 9/10/2021, 2:57:05 PM

# Main Link Section

google finance | finance.google.com

# Secondary Section

sample alert js | javascript://alert('hello')
sample data url | data:text/html,%3Chtml%3E%0A%20%20%3Chead%3E%0A%20%20%20%20%3Cmeta%20charset%3D'utf-8'%20%2F%3E%0A%20%20%20%20%3Ctitle%3ELoading...%3C%2Ftitle%3E%0A%20%20%20%20%3Clink%20rel%3D%22stylesheet%22%20href%3D%22http%3A%2F%2Flocalhost%3A8080%2Findex.css%22%20%2F%3E%0A%20%20%3C%2Fhead%3E%0A%20%20%3Cload%20%2F%3E%0A%20%20%3Cscript%20type%3D'schema'%3E!%20Data%20Test%20Navigation%0A%0A%23%20Main%20Section%0Agoogle%7Cgoogle.com%3C%2Fscript%3E%0A%20%20%3Cscript%20src%3D'https%3A%2F%2Funpkg.com%2F%40babel%2Fstandalone%2Fbabel.min.js'%3E%3C%2Fscript%3E%0A%20%20%3Cscript%20src%3D'http%3A%2F%2Flocalhost%3A8080%2Findex.jsx'%20type%3D'text%2Fbabel'%20data-presets%3D'react'%20data-type%3D'module'%3E%3C%2Fscript%3E%0A%3C%2Fhtml%3E

# Notes

```
TODO 1
TODO 2
```

# Tabs

>>> tabName1|blockId1>>>tabName2|blockId2

```blockId1
sample blockId1
```

---blockId2
<u><b>sample html</b></u> blockId2
---

````

## Screenshots

This is the generated view of the above schema
![image](https://user-images.githubusercontent.com/3792401/132922042-76a8b14d-270c-415c-8a0e-00d0f5f252f6.png)

```

```
