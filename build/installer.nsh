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

    ; Applications Open Verb
    WriteRegStr HKLM "Software\Classes\Applications\ffinflow.exe\shell\open\command" "" '"$INSTDIR\ffinflow.exe" "%1"'

    ; ffinflow.AssocFile type definition
    WriteRegStr HKLM "Software\Classes\ffinflow.AssocFile" "" "ffinflow Media File"
    WriteRegStr HKLM "Software\Classes\ffinflow.AssocFile\DefaultIcon" "" "$INSTDIR\ffinflow.exe,0"
    WriteRegStr HKLM "Software\Classes\ffinflow.AssocFile\shell\open\command" "" '"$INSTDIR\ffinflow.exe" "%1"'

    ; Register individual extensions
    WriteRegStr HKLM "Software\Classes\.mp4" "" "ffinflow.AssocFile"
    WriteRegStr HKLM "Software\Classes\.mkv" "" "ffinflow.AssocFile"
    WriteRegStr HKLM "Software\Classes\.avi" "" "ffinflow.AssocFile"
    WriteRegStr HKLM "Software\Classes\.webm" "" "ffinflow.AssocFile"
    WriteRegStr HKLM "Software\Classes\.mov" "" "ffinflow.AssocFile"
    WriteRegStr HKLM "Software\Classes\.flv" "" "ffinflow.AssocFile"
    WriteRegStr HKLM "Software\Classes\.3gp" "" "ffinflow.AssocFile"
    WriteRegStr HKLM "Software\Classes\.wmv" "" "ffinflow.AssocFile"
    WriteRegStr HKLM "Software\Classes\.ts" "" "ffinflow.AssocFile"
    WriteRegStr HKLM "Software\Classes\.m4v" "" "ffinflow.AssocFile"

    ; Register OpenWithProgids so it shows up in "Open With" list even if UserChoice exists
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

    ; Notify shell of associations update
    System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0, i 0, i 0)'
  ${EndIf}
!macroend

!macro customUnInstall
  DeleteRegKey HKLM "Software\Classes\ffinflow.AssocFile"
  DeleteRegKey HKLM "Software\Classes\Applications\ffinflow.exe"

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
