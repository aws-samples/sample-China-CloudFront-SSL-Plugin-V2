import React, {useEffect, useState} from "react";
import axios from "axios";
import {Box, Button, ColumnLayout, FormField, Input, Modal, SpaceBetween} from "@cloudscape-design/components";
import {t} from "i18next";
import Flashbar from "@cloudscape-design/components/flashbar";
import {useDispatch, useSelector} from "react-redux";
import {setDeleteMailModal, setRefreshEmail} from "../../redux/actions";
import {v4 as uuidv4} from "uuid";

function DeleteEmailModal() {
    const data = useSelector(state => state.stateRedux.openDeleteMailModal)
    const show = data.show

    const [placeholderEmail, setPlaceholderEmail] = useState('');
    const [TipsItems, setTipsItems] = React.useState([]);
    const [EmailInputText, setEmailInputText] = useState('');
    const apiToken = useSelector(state => state.stateRedux.apiToken)
    const dispatch = useDispatch();

    useEffect(() => {
        console.log("DeleteEmailModal->useEffect")
        console.log("apiToken", apiToken)
        const selectedItems = data.item
        if (selectedItems && selectedItems.length === 1) {
            setPlaceholderEmail(selectedItems[0].Endpoint)
        }
        setEmailInputText('');
    }, [show]);

    const handleClose = () => {
        setTipsItems([])
        dispatch(setRefreshEmail(uuidv4()))
        dispatch(setDeleteMailModal({
            show: false,
            item: null
        }))
    }

    const handleDeleteEmailSubmit = event => {
        event.preventDefault();
        setTipsItems([
            {
                type: "info",
                dismissible: false,
                dismissLabel: "Dismiss message",
                onDismiss: () => setTipsItems([]),
                content: (
                    <>
                        Deleting Email Address
                    </>
                ),
            }
        ]);
        if (placeholderEmail === EmailInputText) {
            axios.post(
                './api/deleteemail',
                {
                    ProjectName: `${data["project_name"]}`,
                    Email: `${EmailInputText}`,
                },
                {
                    headers: {
                        authorization: apiToken
                    }
                }
            ).then((response) => {
                console.log(response);
                handleClose()
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
            })
        }else{
            setTipsItems([
                {
                    type: "error",
                    dismissible: true,
                    dismissLabel: "Dismiss message",
                    onDismiss: () => setTipsItems([]),
                    content: (
                        <>
                            Inconsistent email address
                        </>
                    ),
                }
            ]);
        }
    };

    const inputExists = (EmailInputText!=='' && EmailInputText === placeholderEmail);

    return (
        <Modal
            visible={show}
            onDismiss={handleClose}
            header={t('DeleteEmail')+'"' + placeholderEmail + '"?'}
        >
            {(
                <SpaceBetween size="m">
                    <FormField label={t("DeleteNote")}>
                        <ColumnLayout columns={1}>
                            <Input
                                placeholder={placeholderEmail}
                                onChange={event => setEmailInputText(event.detail.value)}
                                value={EmailInputText}
                                ariaRequired={true}
                            />
                        </ColumnLayout>
                    </FormField>
                    <Box float="right">
                        <SpaceBetween direction="horizontal" size="xs">
                            <Button variant="primary" disabled={!inputExists} data-testid="submit"
                                    onClick={handleDeleteEmailSubmit}>
                                {t('Delete')}
                            </Button>
                        </SpaceBetween>
                    </Box>
                    <Flashbar items={TipsItems}/>
                </SpaceBetween>
            )}
        </Modal>
    );
}

export default DeleteEmailModal
