import React, {useEffect, useState} from "react";
import axios from "axios";
import {Box, Button, ColumnLayout, FormField, Input, Modal, SpaceBetween} from "@cloudscape-design/components";
import {t} from "i18next";
import Flashbar from "@cloudscape-design/components/flashbar";
import {useDispatch, useSelector} from "react-redux";
import {setAlertModalMsg, setDeleteModal, setRefreshProject} from "../../redux/actions";
import {v4 as uuidv4} from "uuid";

function DeleteProjectModal(props) {
    const show = useSelector(state => state.stateRedux.openDeleteModal)
    const dispatch = useDispatch();

    const stateList =
        {
            "CREATE_COMPLETE": "success",
            "CREATE_FAILED": "error",
            "DELETE_COMPLETE": "success",
            "DELETE_FAILED": "error",
            "UPDATE_COMPLETE": "success",
            "UPDATE_FAILED": "error",
            "ROLLBACK_COMPLETE": "error",
            "ROLLBACK_FAILED": "error",
            "UPDATE_ROLLBACK_COMPLETE": "error",
            "UPDATE_ROLLBACK_FAILED": "error",
        }

    const [nameInputText, setNameInputText] = useState('');
    const [placeholderProject, setPlaceholderProject] = useState('');

    const [TipsItems, setTipsItems] = React.useState([]);
    const [EnableSubmitButton, setEnableSubmitButton] = React.useState(true);
    const apiToken = useSelector(state => state.stateRedux.apiToken)


    useEffect(() => {
        if (show) {
            console.log("DeleteModal->useEffect")
            console.log("apiToken", apiToken)
            const selectedItems = props.selectedItems
            console.log(selectedItems)
            setEnableSubmitButton(true)
            if (selectedItems.length === 1 && selectedItems[0].CertListContent.length===0) {
                setPlaceholderProject(selectedItems[0].Name)
                setNameInputText('');
            }else{
                dispatch(setAlertModalMsg({
                    type: "warning",
                    visible: true,
                    title: t('DeleteNoticeTitle'),
                    msg: t('DeleteNotice')
                }))
                setTipsItems([])
                setNameInputText('');
                dispatch(setDeleteModal(false))
            }
        }
    }, [show]);


    const handleClose = () => {
        if(setEnableSubmitButton){
            setTipsItems([])
            setNameInputText('');
            dispatch(setRefreshProject(uuidv4()))
            dispatch(setDeleteModal(false))
        }
    }


    const handleDeleteSubmit = event => { //async()
        event.preventDefault();
        const selectedItems = props.selectedItems
        if(selectedItems[0].CertListContent.length===0){
            setTipsItems([
                {
                    type: "info",
                    loading: true,
                    dismissible: false,
                    dismissLabel: "Dismiss message",
                    onDismiss: () => setTipsItems([]),
                    content: (
                        <>
                            DELETE_IN_PROGRESS
                        </>
                    ),
                }
            ]);

            setEnableSubmitButton(false)
            axios.post(
                './api/deleteproject',
                {
                    ProjectName: `${placeholderProject}`,
                },
                {
                    headers: {
                        authorization: apiToken
                    }
                }
            ).then((response) => {
                checkState(placeholderProject)
            }).catch(err => {
                console.log(err.response);
                setTipsItems([
                    {
                        header: err.response.status + " - " + err.response.statusText,
                        type: "error",
                        content: err.response.data.message,
                        dismissible: true,
                        dismissLabel: "Dismiss message",
                        onDismiss: () => setTipsItems([]),
                    }
                ])
                setEnableSubmitButton(true)
            });
        }

    };


    const checkState = async (projectName) => {
        try {
            const response = await axios.post(
                './api/check_stack_state',
                {
                    ProjectName: projectName,
                },
                {
                    headers: {
                        authorization: apiToken
                    }
                }
            );
            const currentStatus = response.data.message;
            console.log(response)

            if (currentStatus in stateList) {
                setTipsItems([
                    {
                        type: stateList[currentStatus],
                        loading: false,
                        dismissible: true,
                        dismissLabel: "Dismiss message",
                        onDismiss: () => setTipsItems([]),
                        content: (
                            <>
                                {currentStatus}
                            </>
                        ),
                    }
                ]);
                setEnableSubmitButton(true)
                return;
            } else {
                setTipsItems([
                    {
                        type: "info",
                        loading: true,
                        dismissible: false,
                        content: (
                            <>
                                {currentStatus}
                            </>
                        ),
                    }
                ]);
                await new Promise(resolve => setTimeout(resolve, 10000));
                return checkState(projectName);
            }
        } catch (err) {
            console.log(err.response);
            if(err.response.data.message.includes(projectName+'-CertBot does not exist')){
                setTipsItems([
                    {
                        type: "info",
                        dismissible: true,
                        content: (
                            <>
                                {"DELETE_COMPLETE OR "+projectName+" Stack does not exist"}
                            </>
                        ),
                        onDismiss: () => setTipsItems([]),
                    }
                ])
            }else{
                setTipsItems([
                    {
                        header: err.response.status + " - " + err.response.statusText,
                        type: "error",
                        content: err.response.data.message,
                        dismissible: true,
                        dismissLabel: "Dismiss message",
                        onDismiss: () => setTipsItems([]),
                    }
                ])
            }
            setEnableSubmitButton(true)

        }
    };

    const inputExists = (nameInputText !== '' && nameInputText === placeholderProject);
    let disableButton = true
    if (EnableSubmitButton && inputExists) {
        disableButton = false
    }


    return (
        <Modal
            visible={show}
            onDismiss={handleClose}
            header={t('DeleteProject') + '"' + placeholderProject + '"?'}
        >
            {(
                <SpaceBetween size="m">
                    {}
                    {/*<form onSubmit={handleCreateSubmit}>*/}
                    <FormField label={t('DeleteNote')}>
                        <ColumnLayout columns={1}>
                            <Input
                                placeholder={placeholderProject}
                                onChange={event => setNameInputText(event.detail.value)}
                                value={nameInputText}
                                ariaRequired={true}
                            />
                        </ColumnLayout>
                    </FormField>
                    <Box float="right">
                        <SpaceBetween direction="horizontal" size="xs">
                            <Button variant="normal" onClick={handleClose}>
                                {t('Cancel')}
                            </Button>
                            <Button variant="primary" disabled={disableButton} data-testid="submit"
                                    onClick={handleDeleteSubmit}>
                                {t('Delete')}
                            </Button>
                        </SpaceBetween>
                    </Box>
                    {/*</form>*/}
                    <Flashbar items={TipsItems}/>
                </SpaceBetween>
            )}
        </Modal>
    );


}


export default DeleteProjectModal
