# syntaks

A single-file browser app for building and editing simple syntax trees for Danish grammar teaching.

The app is designed for classroom and feedback workflows where the teacher or student needs to quickly turn a sentence into a visual tree with grammatical functions such as `S`, `V`, `DO`, `IO`, `SP`, `A`, `K`, or `?` for exercises.

## What it does

- Create multiple syntax trees in one project.
- Build trees from a sentence/root node using a command-style input field.
- Add child nodes under the currently selected node.
- Use `?` nodes to prepare exercises where students must identify the function.
- Click words in the token row and tag them as syntactic functions.
- Move nodes on the canvas; dragging a node also moves its children.
- Align tree levels automatically.
- Snap dragged nodes to clean positions and line angles.
- Edit nodes directly on the canvas.
- Undo and redo changes.
- Save and load project JSON files.
- Autosave locally in the browser.
- Use a compact Gruvbox-inspired interface.

## Quick start

This is a static app. There is no build step and no server requirement.

Open `index.html` directly in a browser, or deploy it as a static site.

For Vercel, the repository can be as simple as:

```text
index.html
README.md
```

Then push to GitHub and import the repository in Vercel.

## Basic workflow

1. Open the app.
2. Use the top input field to enter a sentence on an empty tree.
3. Press `Enter` to create the root sentence node.
4. Select the node you want to build under.
5. Type a label such as `S`, `V`, `DO`, `SP`, or `?` in the top input field.
6. Press `Enter` to add that node below the selected parent.
7. Continue building the tree.
8. Press `L` or use the `align` button to clean up the layout.

Example:

```text
Drengen køber slik.
```

Possible structure:

```text
        Drengen køber slik.
          /       |       \
         S        V       DO
         |        |        |
      Drengen   køber    slik
```

## Top input field

The top input field works as the main tree-building command line.

On an empty tree, it creates the first/root sentence node.

After that, it adds a new node under the currently selected node. This makes it possible to work through complex sentences by selecting a phrase or clause node and then adding more structure underneath it.

## Word selection and tagging

The word row shows the sentence split into clickable tokens.

You can select one or more words and tag them as a syntactic function. The app then creates a grammar node and a word/phrase node below the currently selected parent.

For example, selecting:

```text
[De] [fleste] [elever]
```

and tagging it as `S` creates:

```text
S
|
De fleste elever
```

Use `?` when preparing exercises where students should supply the label themselves.

## Keyboard shortcuts

| Shortcut | Action |
|---|---|
| `Enter` | Edit selected node, or submit the top input when it is focused |
| `F2` | Edit selected node |
| `Esc` | Cancel editing or clear word selection |
| `Arrow keys` | Navigate between nodes |
| `C` | Add child node |
| `S` | Add sibling node |
| `Delete` / `Backspace` | Delete selected node |
| `L` | Align the current tree |
| `Ctrl+Z` | Undo |
| `Ctrl+Y` | Redo |
| `Ctrl+Shift+Z` | Redo |
| `0` | Reset view |

## Canvas controls

- Drag the background to pan.
- Use the mouse wheel to zoom.
- Drag a node to move it and its children.
- Hold `Alt` while dragging to temporarily disable snapping.
- Use `fit` to fit the tree into the visible canvas.
- Use `align` to place levels neatly.

## Project controls

The sidebar contains project-level actions:

- `new` creates a new project.
- `load` opens a saved JSON project.
- `save` downloads the current project as JSON.
- `+ tree` adds another tree to the project.
- `delete` deletes the current tree.
- `start over` clears the current analysis while keeping the root sentence node.

The list of trees scrolls independently, so the help/status area remains visible even when the project contains many trees.

## Data and privacy

Projects are stored in the browser using `localStorage` for autosave. Saving a project creates a JSON file that stays on your computer unless you choose to share it.

No account, server, database, tracking, or external API is required.

## Deployment notes

Because the app is a single HTML file, deployment is straightforward:

```bash
git add index.html README.md
git commit -m "Update syntaks app and README"
git push origin master
```

If a deployed version still shows old code, hard-refresh the browser with `Ctrl+Shift+R`, or open the site with a cache-busting query string such as:

```text
https://your-site.vercel.app/?v=14
```

## Current version

Current app marker: `v14 compact sidebar and flexible nodes`.

If the sidebar or status bar shows an older version, the browser or deployment is still serving a cached copy.
