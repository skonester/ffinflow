!ifndef FFINFLOW_ASSOCIATIONS_INCLUDED
!define FFINFLOW_ASSOCIATIONS_INCLUDED
!include LogicLib.nsh
; Follow electron-builder's install scope. Tests redirect to an isolated key.
!ifndef FFINFLOW_REG_ROOT
  !define FFINFLOW_REG_ROOT SHCTX
!endif
!ifndef FFINFLOW_REG_BASE
  !define FFINFLOW_REG_BASE "Software"
!endif

!macro FFinflowExtensions ACTION
  !insertmacro ${ACTION} ".mp4" "Video"
  !insertmacro ${ACTION} ".mkv" "Video"
  !insertmacro ${ACTION} ".avi" "Video"
  !insertmacro ${ACTION} ".webm" "Video"
  !insertmacro ${ACTION} ".mov" "Video"
  !insertmacro ${ACTION} ".flv" "Video"
  !insertmacro ${ACTION} ".3gp" "Video"
  !insertmacro ${ACTION} ".wmv" "Video"
  !insertmacro ${ACTION} ".ts" "Video"
  !insertmacro ${ACTION} ".m4v" "Video"
  !insertmacro ${ACTION} ".mp3" "Audio"
  !insertmacro ${ACTION} ".wav" "Audio"
  !insertmacro ${ACTION} ".ogg" "Audio"
  !insertmacro ${ACTION} ".aac" "Audio"
  !insertmacro ${ACTION} ".m4a" "Audio"
  !insertmacro ${ACTION} ".flac" "Audio"
  !insertmacro ${ACTION} ".wma" "Audio"
  !insertmacro ${ACTION} ".opus" "Audio"
!macroend

!macro FFinflowRegisterExtension EXT TYPE
  WriteRegStr ${FFINFLOW_REG_ROOT} "${FFINFLOW_REG_BASE}\Classes\${EXT}\OpenWithProgids" "ffinflow.${TYPE}" ""
  WriteRegStr ${FFINFLOW_REG_ROOT} "${FFINFLOW_REG_BASE}\ffinflow\Capabilities\FileAssociations" "${EXT}" "ffinflow.${TYPE}"
  WriteRegStr ${FFINFLOW_REG_ROOT} "${FFINFLOW_REG_BASE}\Classes\Applications\${APP_EXECUTABLE_FILENAME}\SupportedTypes" "${EXT}" ""
!macroend

!macro FFinflowRegisterType TYPE
  WriteRegStr ${FFINFLOW_REG_ROOT} "${FFINFLOW_REG_BASE}\Classes\ffinflow.${TYPE}" "" "ffinflow ${TYPE}"
  WriteRegStr ${FFINFLOW_REG_ROOT} "${FFINFLOW_REG_BASE}\Classes\ffinflow.${TYPE}" "FriendlyTypeName" "ffinflow ${TYPE}"
  WriteRegStr ${FFINFLOW_REG_ROOT} "${FFINFLOW_REG_BASE}\Classes\ffinflow.${TYPE}\DefaultIcon" "" '"$INSTDIR\${APP_EXECUTABLE_FILENAME}",0'
  WriteRegStr ${FFINFLOW_REG_ROOT} "${FFINFLOW_REG_BASE}\Classes\ffinflow.${TYPE}\shell\open" "FriendlyAppName" "ffinflow"
  WriteRegStr ${FFINFLOW_REG_ROOT} "${FFINFLOW_REG_BASE}\Classes\ffinflow.${TYPE}\shell\open" "MultiSelectModel" "Player"
  WriteRegStr ${FFINFLOW_REG_ROOT} "${FFINFLOW_REG_BASE}\Classes\ffinflow.${TYPE}\shell\open\command" "" '"$INSTDIR\${APP_EXECUTABLE_FILENAME}" "%1"'
  WriteRegStr ${FFINFLOW_REG_ROOT} "${FFINFLOW_REG_BASE}\Classes\ffinflow.${TYPE}\shell\play\command" "" '"$INSTDIR\${APP_EXECUTABLE_FILENAME}" "%1"'
!macroend

!macro FFinflowRegisterAssociations
  WriteRegStr ${FFINFLOW_REG_ROOT} "${FFINFLOW_REG_BASE}\Microsoft\Windows\CurrentVersion\App Paths\${APP_EXECUTABLE_FILENAME}" "" "$INSTDIR\${APP_EXECUTABLE_FILENAME}"
  WriteRegStr ${FFINFLOW_REG_ROOT} "${FFINFLOW_REG_BASE}\ffinflow\Capabilities" "ApplicationName" "ffinflow"
  WriteRegStr ${FFINFLOW_REG_ROOT} "${FFINFLOW_REG_BASE}\ffinflow\Capabilities" "ApplicationDescription" "ffinflow video and audio player"
  WriteRegStr ${FFINFLOW_REG_ROOT} "${FFINFLOW_REG_BASE}\ffinflow\Capabilities" "ApplicationIcon" '"$INSTDIR\${APP_EXECUTABLE_FILENAME}",0'
  WriteRegStr ${FFINFLOW_REG_ROOT} "${FFINFLOW_REG_BASE}\RegisteredApplications" "ffinflow" "${FFINFLOW_REG_BASE}\ffinflow\Capabilities"
  WriteRegStr ${FFINFLOW_REG_ROOT} "${FFINFLOW_REG_BASE}\Classes\Applications\${APP_EXECUTABLE_FILENAME}" "FriendlyAppName" "ffinflow"
  WriteRegStr ${FFINFLOW_REG_ROOT} "${FFINFLOW_REG_BASE}\Classes\Applications\${APP_EXECUTABLE_FILENAME}" "AppUserModelID" "com.ffinflow.mediaplayer"
  WriteRegStr ${FFINFLOW_REG_ROOT} "${FFINFLOW_REG_BASE}\Classes\Applications\${APP_EXECUTABLE_FILENAME}\DefaultIcon" "" '"$INSTDIR\${APP_EXECUTABLE_FILENAME}",0'
  WriteRegStr ${FFINFLOW_REG_ROOT} "${FFINFLOW_REG_BASE}\Classes\Applications\${APP_EXECUTABLE_FILENAME}\shell\open\command" "" '"$INSTDIR\${APP_EXECUTABLE_FILENAME}" "%1"'
  !insertmacro FFinflowRegisterType "Video"
  !insertmacro FFinflowRegisterType "Audio"
  ; Keep the old ProgID working for users who already selected it in Windows.
  !insertmacro FFinflowRegisterType "AssocFile"
  !insertmacro FFinflowExtensions FFinflowRegisterExtension
  System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0, p 0, p 0)'
!macroend

!macro FFinflowRemoveExtension EXT TYPE
  DeleteRegValue ${FFINFLOW_REG_ROOT} "${FFINFLOW_REG_BASE}\Classes\${EXT}\OpenWithProgids" "ffinflow.${TYPE}"
  DeleteRegValue ${FFINFLOW_REG_ROOT} "${FFINFLOW_REG_BASE}\Classes\${EXT}\OpenWithProgids" "ffinflow.AssocFile"
  DeleteRegKey /ifempty ${FFINFLOW_REG_ROOT} "${FFINFLOW_REG_BASE}\Classes\${EXT}\OpenWithProgids"
  ; Clean old defaults only when they still point to our ProgID.
  ReadRegStr $0 ${FFINFLOW_REG_ROOT} "${FFINFLOW_REG_BASE}\Classes\${EXT}" ""
  ${If} $0 == "ffinflow.AssocFile"
  ${OrIf} $0 == "ffinflow.${TYPE}"
    DeleteRegValue ${FFINFLOW_REG_ROOT} "${FFINFLOW_REG_BASE}\Classes\${EXT}" ""
  ${EndIf}
  DeleteRegKey /ifempty ${FFINFLOW_REG_ROOT} "${FFINFLOW_REG_BASE}\Classes\${EXT}"
!macroend

!macro FFinflowRemoveAssociations
  !insertmacro FFinflowExtensions FFinflowRemoveExtension
  DeleteRegValue ${FFINFLOW_REG_ROOT} "${FFINFLOW_REG_BASE}\RegisteredApplications" "ffinflow"
  DeleteRegKey ${FFINFLOW_REG_ROOT} "${FFINFLOW_REG_BASE}\ffinflow\Capabilities"
  DeleteRegKey ${FFINFLOW_REG_ROOT} "${FFINFLOW_REG_BASE}\Classes\Applications\${APP_EXECUTABLE_FILENAME}"
  DeleteRegKey ${FFINFLOW_REG_ROOT} "${FFINFLOW_REG_BASE}\Classes\ffinflow.Video"
  DeleteRegKey ${FFINFLOW_REG_ROOT} "${FFINFLOW_REG_BASE}\Classes\ffinflow.Audio"
  DeleteRegKey ${FFINFLOW_REG_ROOT} "${FFINFLOW_REG_BASE}\Classes\ffinflow.AssocFile"
  DeleteRegKey ${FFINFLOW_REG_ROOT} "${FFINFLOW_REG_BASE}\Clients\Media\ffinflow"
  DeleteRegKey ${FFINFLOW_REG_ROOT} "${FFINFLOW_REG_BASE}\Microsoft\Windows\CurrentVersion\App Paths\${APP_EXECUTABLE_FILENAME}"
  System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0, p 0, p 0)'
!macroend
!endif
