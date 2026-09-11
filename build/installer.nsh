!include nsDialogs.nsh
!include LogicLib.nsh
!include "${BUILD_RESOURCES_DIR}\file-associations.nsh"

Var VideoAssocCheckbox
Var AudioAssocCheckbox
Var VideoAssocState
Var AudioAssocState

!macro customInit
  ; Silent install/update skips pages, so initialize the choice here.
  ReadRegDWORD $VideoAssocState SHCTX "Software\ffinflow\Installer" "FileAssociationsVideo"
  ${If} $VideoAssocState == ""
    StrCpy $VideoAssocState 1
  ${EndIf}
  ReadRegDWORD $AudioAssocState SHCTX "Software\ffinflow\Installer" "FileAssociationsAudio"
  ${If} $AudioAssocState == ""
    StrCpy $AudioAssocState 1
  ${EndIf}
!macroend

!ifndef BUILD_UNINSTALLER
!macro customPageAfterChangeDir
  Page custom FFinflowAssociationsPage FFinflowAssociationsLeave
!macroend

Function FFinflowAssociationsPage
  nsDialogs::Create 1018
  Pop $0
  ${If} $0 == error
    Abort
  ${EndIf}

  ${NSD_CreateLabel} 0 0 100% 30u "Choose which file types open with ffinflow. Windows Default Apps still lets you change this per file type later; this only sets what ffinflow offers."
  Pop $0

  ${NSD_CreateCheckbox} 0 38u 100% 22u "Video files (.mp4, .mkv, .avi, .webm, .mov, .flv, .3gp, .wmv, .ts, .m4v)"
  Pop $VideoAssocCheckbox
  ${NSD_SetState} $VideoAssocCheckbox $VideoAssocState

  ${NSD_CreateCheckbox} 0 62u 100% 22u "Audio files (.mp3, .wav, .ogg, .aac, .m4a, .flac, .wma, .opus)"
  Pop $AudioAssocCheckbox
  ${NSD_SetState} $AudioAssocCheckbox $AudioAssocState

  nsDialogs::Show
FunctionEnd

Function FFinflowAssociationsLeave
  ${NSD_GetState} $VideoAssocCheckbox $VideoAssocState
  ${NSD_GetState} $AudioAssocCheckbox $AudioAssocState
FunctionEnd
!endif

!macro customInstall
  WriteRegDWORD SHCTX "Software\ffinflow\Installer" "FileAssociationsVideo" $VideoAssocState
  WriteRegDWORD SHCTX "Software\ffinflow\Installer" "FileAssociationsAudio" $AudioAssocState

  !insertmacro FFinflowRegisterAppCapabilities

  ${If} $VideoAssocState == 1
    !insertmacro FFinflowVideoExtensions FFinflowRegisterExtension
  ${Else}
    !insertmacro FFinflowVideoExtensions FFinflowRemoveExtension
  ${EndIf}

  ${If} $AudioAssocState == 1
    !insertmacro FFinflowAudioExtensions FFinflowRegisterExtension
  ${Else}
    !insertmacro FFinflowAudioExtensions FFinflowRemoveExtension
  ${EndIf}

  System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0, p 0, p 0)'
!macroend

!macro customUnInstall
  !insertmacro FFinflowRemoveAssociations
  DeleteRegKey SHCTX "Software\ffinflow\Installer"
  DeleteRegKey /ifempty SHCTX "Software\ffinflow"
!macroend
