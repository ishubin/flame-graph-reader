Flame Graph Reader
==================

**Flame Graph Reader** - is an interactive, in-browser flame graph visualization tool. It focuses on profiling investigation experience and helps you quickly analyze performance of your apps


h3. Features (TODO)
- [x] Zoom in/out
- [x] Loading multiple flame graphs
- [x] Sorting child flames alphabetically
- [x] Selecting frames
- [x] Zoom by mouse (drawing rect on the screen to which it should zoom horizontally)
- [x] Search
- [x] Annotate. Use tags that could combine multiple frames (e.g. 'networking', 'mysql', 'cache-lookup' etc.). Allow custom tags + multiple regex search terms per tag
- [x] Compare two flame graphs (show in tabs + diff view)
- [x] Invert stack traces
- [x] Repair stacks (sort of works)
- [x] Render in compact form
- [x] Annotations quick on/off checkboxes in bottom panel
- [x] Save annotations in local storage
- [x] By frame overview table mode.
    - [x] with diff mode
    - [x] improve search typing
- [x] Quick search for the same frame
- [x] Annotation Custom Colors
- [x] Mark code path as suspicious/good/bad
- [x] export report to custom format (with annotations)
- [x] Quick search frame from context menu
- [x] Copy frame name to clipboard (from context menu)
- [x] Quick search does not show samples correctly in the bottom panel
- [x] Rename flame graph tab
- [x] Fix mouse out (it should reset hovered frame)
- [x] License
- [x] Flame graph comparison is not working (colors are not used)
- [x] Rename frame. This will allow it to be compared correctly
- [x] Context menu should disappear if clicked anywhere else
- [ ] Regex based search and replace
- [ ] Improve CSS make it look less ugly
- [ ] Various color themes
- [ ] Import from Chrome developer tools (JSON Trace Event Format)
- [ ] README file


License
---------
This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.