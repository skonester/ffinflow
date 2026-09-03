!include nsDialogs.nsh
!include LogicLib.nsh

Var Dialog
Var Checkbox
Var AssociateState

; Helper macro to safely remove file association if it still points to ffinflow
!macro SafeRemoveAssociation EXT
  ReadRegStr $0 HKLM "Software\Classes\${EXT}" ""
  ${If} $0 == "ffinflow.AssocFile"
    DeleteRegValue HKLM "Software\Classes\${EXT}" ""
  ${EndIf}
  DeleteRegValue HKLM "Software\Classes\${EXT}\OpenWithProgids" "ffinflow.AssocFile"
!macroend

; Hook into customHeader to insert our custom page
!macro customHeader
  Page custom myCustomPage myCustomPageLeave
!macroend

Function myCustomPage
  nsDialogs::Create 1018
  Pop $Dialog

  ${If} $Dialog == error
    Abort
  ${EndIf}

  ${NSD_CreateLabel} 0 0 100% 24u "File Associations Setup"
  Pop $0
  
  ${NSD_CreateLabel} 0 30u 100% 24u "Choose whether to make ffinflow the default player for common media formats. This enables direct playback when double-clicking files."
  Pop $0

  ${NSD_CreateCheckbox} 0 60u 100% 12u "Make ffinflow the default player for common media files (.mp4, .mkv, .avi, .webm, .mov, .flv, .3gp, .wmv, .ts, .m4v)"
  Pop $Checkbox
  
  ; Default to checked (like VLC does)
  ${NSD_Check} $Checkbox

  nsDialogs::Show
FunctionEnd

Function myCustomPageLeave
  ${NSD_GetState} $Checkbox $AssociateState
FunctionEnd

!macro customInstall
  ${If} $AssociateState == 1
    DetailPrint "Registering machine-wide file associations..."

    ; --- RegisteredApplications (required for Windows 11 Default Apps) ---
    WriteRegStr HKLM "Software\RegisteredApplications" "ffinflow" "Software\ffinflow\Capabilities"

    ; --- RegisteredApplication definition ---
    WriteRegStr HKLM "Software\ffinflow" "" "ffinflow Media Player"
    WriteRegStr HKLM "Software\ffinflow\Capabilities" "ApplicationName" "ffinflow"
    WriteRegStr HKLM "Software\ffinflow\Capabilities" "ApplicationDescription" "ffinflow is an FFmpeg-based media player supporting a wide range of video and audio formats."
    WriteRegStr HKLM "Software\ffinflow\Capabilities" "ApplicationIcon" '"$INSTDIR\ffinflow.exe",0'
    WriteRegStr HKLM "Software\ffinflow\Capabilities" "FileAssociations" ".mp4" "ffinflow.AssocFile"
    WriteRegStr HKLM "Software\ffinflow\Capabilities" "FileAssociations" ".mkv" "ffinflow.AssocFile"
    WriteRegStr HKLM "Software\ffinflow\Capabilities" "FileAssociations" ".avi" "ffinflow.AssocFile"
    WriteRegStr HKLM "Software\ffinflow\Capabilities" "FileAssociations" ".webm" "ffinflow.AssocFile"
    WriteRegStr HKLM "Software\ffinflow\Capabilities" "FileAssociations" ".mov" "ffinflow.AssocFile"
    WriteRegStr HKLM "Software\ffinflow\Capabilities" "FileAssociations" ".flv" "ffinflow.AssocFile"
    WriteRegStr HKLM "Software\ffinflow\Capabilities" "FileAssociations" ".3gp" "ffinflow.AssocFile"
    WriteRegStr HKLM "Software\ffinflow\Capabilities" "FileAssociations" ".wmv" "ffinflow.AssocFile"
    WriteRegStr HKLM "Software\ffinflow\Capabilities" "FileAssociations" ".ts" "ffinflow.AssocFile"
    WriteRegStr HKLM "Software\ffinflow\Capabilities" "FileAssociations" ".m4v" "ffinflow.AssocFile"
    WriteRegStr HKLM "Software\ffinflow\Capabilities" "SupportedTypes" ".mp4;.mkv;.avi;.webm;.mov;.flv;.3gp;.wmv;.ts;.m4v"

    ; --- Modern Windows Media Client Registration (like VLC) ---
    WriteRegStr HKLM "Software\Clients\Media\ffinflow" "" "ffinflow Media Player"
    WriteRegStr HKLM "Software\Clients\Media\ffinflow\Capabilities" "ApplicationDescription" "ffinflow is an FFmpeg-based media player supporting a wide range of video and audio formats."
    WriteRegStr HKLM "Software\Clients\Media\ffinflow\Capabilities" "ApplicationName" "ffinflow"
    WriteRegStr HKLM "Software\Clients\Media\ffinflow\Capabilities" "ApplicationIcon" '"$INSTDIR\ffinflow.exe",0'

    ; FileAssociations under Capabilities (required for Default Apps / Settings)
    WriteRegStr HKLM "Software\Clients\Media\ffinflow\Capabilities\FileAssociations" ".mp4" "ffinflow.AssocFile"
    WriteRegStr HKLM "Software\Clients\Media\ffinflow\Capabilities\FileAssociations" ".mkv" "ffinflow.AssocFile"
    WriteRegStr HKLM "Software\Clients\Media\ffinflow\Capabilities\FileAssociations" ".avi" "ffinflow.AssocFile"
    WriteRegStr HKLM "Software\Clients\Media\ffinflow\Capabilities\FileAssociations" ".webm" "ffinflow.AssocFile"
    WriteRegStr HKLM "Software\Clients\Media\ffinflow\Capabilities\FileAssociations" ".mov" "ffinflow.AssocFile"
    WriteRegStr HKLM "Software\Clients\Media\ffinflow\Capabilities\FileAssociations" ".flv" "ffinflow.AssocFile"
    WriteRegStr HKLM "Software\Clients\Media\ffinflow\Capabilities\FileAssociations" ".3gp" "ffinflow.AssocFile"
    WriteRegStr HKLM "Software\Clients\Media\ffinflow\Capabilities\FileAssociations" ".wmv" "ffinflow.AssocFile"
    WriteRegStr HKLM "Software\Clients\Media\ffinflow\Capabilities\FileAssociations" ".ts" "ffinflow.AssocFile"
    WriteRegStr HKLM "Software\Clients\Media\ffinflow\Capabilities\FileAssociations" ".m4v" "ffinflow.AssocFile"

    ; Supported file types for the application
    WriteRegStr HKLM "Software\Clients\Media\ffinflow\Capabilities" "SupportedTypes" ".mp4;.mkv;.avi;.webm;.mov;.flv;.3gp;.wmv;.ts;.m4v"

    ; --- AppUserModelID (taskbar grouping / jump lists) ---
    WriteRegStr HKLM "Software\Classes\Applications\ffinflow.exe" "AppUserModelID" "com.ffinflow.mediaplayer"

    ; --- Applications Open Verb ---
    WriteRegStr HKLM "Software\Classes\Applications\ffinflow.exe\shell\open\command" "" '"$INSTDIR\ffinflow.exe" "%1"'
    WriteRegStr HKLM "Software\Classes\Applications\ffinflow.exe\SupportedTypes" ".mp4" ""
    WriteRegStr HKLM "Software\Classes\Applications\ffinflow.exe\SupportedTypes" ".mkv" ""
    WriteRegStr HKLM "Software\Classes\Applications\ffinflow.exe\SupportedTypes" ".avi" ""
    WriteRegStr HKLM "Software\Classes\Applications\ffinflow.exe\SupportedTypes" ".webm" ""
    WriteRegStr HKLM "Software\Classes\Applications\ffinflow.exe\SupportedTypes" ".mov" ""
    WriteRegStr HKLM "Software\Classes\Applications\ffinflow.exe\SupportedTypes" ".flv" ""
    WriteRegStr HKLM "Software\Classes\Applications\ffinflow.exe\SupportedTypes" ".3gp" ""
    WriteRegStr HKLM "Software\Classes\Applications\ffinflow.exe\SupportedTypes" ".wmv" ""
    WriteRegStr HKLM "Software\Classes\Applications\ffinflow.exe\SupportedTypes" ".ts" ""
    WriteRegStr HKLM "Software\Classes\Applications\ffinflow.exe\SupportedTypes" ".m4v" ""

    ; --- File Type Definition ---
    WriteRegStr HKLM "Software\Classes\ffinflow.AssocFile" "" "ffinflow Media File"
    WriteRegStr HKLM "Software\Classes\ffinflow.AssocFile" "FriendlyTypeName" "ffinflow Media File"
    WriteRegStr HKLM "Software\Classes\ffinflow.AssocFile\DefaultIcon" "" '"$INSTDIR\ffinflow.exe",0'
    WriteRegStr HKLM "Software\Classes\ffinflow.AssocFile\shell" "" "Open"
    WriteRegStr HKLM "Software\Classes\ffinflow.AssocFile\shell\Open" "" ""
    WriteRegStr HKLM "Software\Classes\ffinflow.AssocFile\shell\Open\command" "" '"$INSTDIR\ffinflow.exe" "%1"'
    WriteRegStr HKLM "Software\Classes\ffinflow.AssocFile\shell\Open" "FriendlyAppName" "ffinflow"
    WriteRegStr HKLM "Software\Classes\ffinflow.AssocFile\shell\Open" "MultiSelectModel" "Player"

    ; --- Per-extension associations ---
    WriteRegStr HKLM "Software\Classes\.mp4" "" "ffinflow.AssocFile"
    WriteRegStr HKLM "Software\Classes\.mp4" "PerceivedType" "video"
    WriteRegStr HKLM "Software\Classes\.mp4" "Content Type" "video/mp4"

    WriteRegStr HKLM "Software\Classes\.mkv" "" "ffinflow.AssocFile"
    WriteRegStr HKLM "Software\Classes\.mkv" "PerceivedType" "video"
    WriteRegStr HKLM "Software\Classes\.mkv" "Content Type" "video/x-matroska"

    WriteRegStr HKLM "Software\Classes\.avi" "" "ffinflow.AssocFile"
    WriteRegStr HKLM "Software\Classes\.avi" "PerceivedType" "video"
    WriteRegStr HKLM "Software\Classes\.avi" "Content Type" "video/avi"

    WriteRegStr HKLM "Software\Classes\.webm" "" "ffinflow.AssocFile"
    WriteRegStr HKLM "Software\Classes\.webm" "PerceivedType" "video"
    WriteRegStr HKLM "Software\Classes\.webm" "Content Type" "video/webm"

    WriteRegStr HKLM "Software\Classes\.mov" "" "ffinflow.AssocFile"
    WriteRegStr HKLM "Software\Classes\.mov" "PerceivedType" "video"
    WriteRegStr HKLM "Software\Classes\.mov" "Content Type" "video/quicktime"

    WriteRegStr HKLM "Software\Classes\.flv" "" "ffinflow.AssocFile"
    WriteRegStr HKLM "Software\Classes\.flv" "PerceivedType" "video"
    WriteRegStr HKLM "Software\Classes\.flv" "Content Type" "video/x-flv"

    WriteRegStr HKLM "Software\Classes\.3gp" "" "ffinflow.AssocFile"
    WriteRegStr HKLM "Software\Classes\.3gp" "PerceivedType" "video"
    WriteRegStr HKLM "Software\Classes\.3gp" "Content Type" "video/3gpp"

    WriteRegStr HKLM "Software\Classes\.wmv" "" "ffinflow.AssocFile"
    WriteRegStr HKLM "Software\Classes\.wmv" "PerceivedType" "video"
    WriteRegStr HKLM "Software\Classes\.wmv" "Content Type" "video/x-ms-wmv"

    WriteRegStr HKLM "Software\Classes\.ts" "" "ffinflow.AssocFile"
    WriteRegStr HKLM "Software\Classes\.ts" "PerceivedType" "video"
    WriteRegStr HKLM "Software\Classes\.ts" "Content Type" "video/mp2t"

    WriteRegStr HKLM "Software\Classes\.m4v" "" "ffinflow.AssocFile"
    WriteRegStr HKLM "Software\Classes\.m4v" "PerceivedType" "video"
    WriteRegStr HKLM "Software\Classes\.m4v" "Content Type" "video/mp4"

    ; --- OpenWithProgids ---
    WriteRegStr HKLM "Software\Classes\.mp4\OpenWithProgids" "ffinflow.AssocFile" ""
    WriteRegStr HKLM "Software\Classes\.mkv\OpenWithProgids" "ffinflow.AssocFile" ""
    WriteRegStr HKLM "Software\Classes\.avi\OpenWithProgids" "ffinflow.AssocFile" ""
    WriteRegStr HKLM "Software\Classes\.webm\OpenWithProgids" "ffinflow.AssocFile" ""
    WriteRegStr HKLM "Software\Classes\.mov\OpenWithProgids" "ffinflow.AssocFile" ""
    WriteRegStr HKLM "Software\Classes\.flv\OpenWithProgids" "ffinflow.AssocFile" ""
    WriteRegStr HKLM "Software\Classes\.3gp\OpenWithProgids" "ffinflow.AssocFile" ""
    WriteRegStr HKLM "Software\Classes\.wmv\OpenWithProgids" "ffinflow.AssocFile" ""
    WriteRegStr HKLM "Software\Classes\.ts\OpenWithProgids" "ffinflow.AssocFile" ""
    WriteRegStr HKLM "Software\Classes\.m4v\OpenWithProgids" "ffinflow.AssocFile" ""

    ; --- Notify shell ---
    System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0, i 0, i 0)'
  ${EndIf}
!macroend

!macro customUnInstall
  ; Remove modern media client registration
  DeleteRegKey HKLM "Software\Clients\Media\ffinflow"
  DeleteRegKey HKLM "Software\RegisteredApplications" "ffinflow"
  DeleteRegKey HKLM "Software\ffinflow"
  DeleteRegKey HKLM "Software\Classes\Applications\ffinflow.exe"

  ; Remove file type definition
  DeleteRegKey HKLM "Software\Classes\ffinflow.AssocFile"

  ; Clean up per-extension associations safely
  !insertmacro SafeRemoveAssociation ".mp4"
  !insertmacro SafeRemoveAssociation ".mkv"
  !insertmacro SafeRemoveAssociation ".avi"
  !insertmacro SafeRemoveAssociation ".webm"
  !insertmacro SafeRemoveAssociation ".mov"
  !insertmacro SafeRemoveAssociation ".flv"
  !insertmacro SafeRemoveAssociation ".3gp"
  !insertmacro SafeRemoveAssociation ".wmv"
  !insertmacro SafeRemoveAssociation ".ts"
  !insertmacro SafeRemoveAssociation ".m4v"

  ; Notify shell of uninstallation cleanup
  System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0, i 0, i 0)'
!macroend
