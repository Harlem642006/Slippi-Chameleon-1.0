Set shell = CreateObject("WScript.Shell")
Set files = CreateObject("Scripting.FileSystemObject")
helperFolder = files.GetParentFolderName(WScript.ScriptFullName)
shell.CurrentDirectory = helperFolder
shell.Run "node.exe """ & files.BuildPath(helperFolder, "index.js") & """", 0, False
