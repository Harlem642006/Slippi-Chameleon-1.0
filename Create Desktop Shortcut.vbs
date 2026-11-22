Set shell = CreateObject("WScript.Shell")
Set files = CreateObject("Scripting.FileSystemObject")

helperFolder = files.GetParentFolderName(WScript.ScriptFullName)
desktopFolder = shell.SpecialFolders("Desktop")
shortcutPath = files.BuildPath(desktopFolder, "Slippi Chameleon.lnk")
targetPath = files.BuildPath(helperFolder, "Slippi Chameleon.vbs")
iconPath = files.BuildPath(helperFolder, "assets\slippi-chameleon.ico")

Set shortcut = shell.CreateShortcut(shortcutPath)
shortcut.TargetPath = targetPath
shortcut.WorkingDirectory = helperFolder
shortcut.IconLocation = iconPath & ",0"
shortcut.Description = "Launch Slippi Chameleon"
shortcut.Save
