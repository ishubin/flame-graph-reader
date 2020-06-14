Flame Graph Reader
==================

**Flame Graph Reader** - is an interactive, in-browser flame graph visualization tool. At this moment is has the following features:

- Regex based annotations.
- Flame graphs comparison
- Marking frames as good, bad, suspicious
- Edit frames names
- Save/load flame graphs


Supported formats
------------------

Flame Graph Reader only supports limited formats:

h6. Folded log

The folded log is text based log where each line represents a stacktrace with a number of observed samples. The frames in the stacktrace are delimited with `;` symbol.
This log can be generated using the scripts from [https://github.com/brendangregg/FlameGraph](https://github.com/brendangregg/FlameGraph) repo

Example:
```
com.example.Main.main;com.example.Main.read 2
com.example.Main.main;com.example.Main.loadFile 1
```


h6. Java Flight Recorder JSON format

There is a way to convert Java Flight Recorder reports to JSON with the help of these tools: [https://github.com/aragozin/jvm-tools](https://github.com/aragozin/jvm-tools)
Here is how to convert your Java Flight Recorder log to json:

```bash
java -jar sjk-plus-0.15.jar jfr2json -i recording.jfr -o recording.json
```

After that you can just load the generated `recording.json` in the Flame Graph Reader


h6. Custom Flame Graph Reader format

This is a JSON based format which Flame Graph Reader uses for saving flame graphs, with marks and annotations.


License
---------
This Source Code is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.