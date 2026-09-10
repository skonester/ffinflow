!include nsDialogs.nsh
!include LogicLib.nsh
!include "${BUILD_RESOURCES_DIR}\file-associations.nsh"

Var AssociationCheckbox
Var AssociateState

!macro customInit
  ; Silent install/update skips pages, so initialize the choice here.
  ReadRegDWORD $AssociateState SHCTX "Software\ffinflow\Installer" "FileAssociations"
  ${If} $AssociateState == ""
    StrCpy $AssociateState 1
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
  ${NSD_CreateLabel} 0 0 100% 40u "Register ffinflow in Open With and Windows Default Apps. Windows lets you choose which media types open with ffinflow; this installer keeps your existing defaults."
  Pop $0
  ${NSD_CreateCheckbox} 0 50u 100% 22u "Register ffinflow for supported video and audio files"
  Pop $AssociationCheckbox
  ${NSD_SetState} $AssociationCheckbox $AssociateState
  nsDialogs::Show
FunctionEnd

Function FFinflowAssociationsLeave
  ${NSD_GetState} $AssociationCheckbox $AssociateState
FunctionEnd
!endif

!macro customInstall
  WriteRegDWORD SHCTX "Software\ffinflow\Installer" "FileAssociations" $AssociateState
  ${If} $AssociateState == 1
    !insertmacro FFinflowRegisterAssociations
  ${Else}
    !insertmacro FFinflowRemoveAssociations
  ${EndIf}
!macroend

!macro customUnInstall
  !insertmacro FFinflowRemoveAssociations
  DeleteRegKey SHCTX "Software\ffinflow\Installer"
  DeleteRegKey /ifempty SHCTX "Software\ffinflow"
!macroend
