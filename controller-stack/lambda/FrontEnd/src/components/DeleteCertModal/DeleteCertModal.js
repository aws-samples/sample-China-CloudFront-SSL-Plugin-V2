import React, {useEffect, useState} from "react";
import axios from "axios";
import {Box, Button, ColumnLayout, FormField, Input, Modal, SpaceBetween} from "@cloudscape-design/components";
import {t} from "i18next";
import Flashbar from "@cloudscape-design/components/flashbar";
import {useDispatch, useSelector} from "react-redux";
import {setDeleteCertModal, setRefreshCert} from "../../redux/actions";
import {v4 as uuidv4} from "uuid";

function DeleteCertModal() {
    const data = useSelector(state => state.stateRedux.openDeleteCertModal)
    const show = data.show

    const [placeholderCertName, setPlaceholderCertName] = useState('');
    const [TipsItems, setTipsItems] = React.useState([]);
    const [nameInputText, setNameInputText] = useState('');
    const apiToken = useSelector(state => state.stateRedux.apiToken)

    const dispatch = useDispatch();

    useEffect(() => {
        console.log("DeleteCert->useEffect")
        console.log("apiToken", apiToken)
        const selectedItems = data.item
        console.log(selectedItems)
        if (selectedItems && selectedItems.length === 1) {
            setPlaceholderCertName(selectedItems[0].ServerCertificateName)
        }
        setNameInputText('');
    }, [show]);

    const handleClose = () => {
        setTipsItems([])
        dispatch(setRefreshCert(uuidv4()))
        dispatch(setDeleteCertModal({
            show: false,
            item: null,
        }))
    }

    const handleDeleteCertSubmit = event => {
        event.preventDefault();
        setTipsItems([
            {
                type: "info",
                dismissible: false,
                content: (
                    <>
                        Deleting IAM Cert
                    </>
                ),
            }
        ]);
        if (placeholderCertName === nameInputText) {
            axios.post(
                './api/deletecert',
                {
                    CertName: `${placeholderCertName}`,
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
        } else {
            setTipsItems([
                {
                    type: "error",
                    dismissible: true,
                    dismissLabel: "Dismiss message",
                    onDismiss: () => setTipsItems([]),
                    content: (
                        <>
                            Inconsistent Delete Cert Name
                        </>
                    ),
                }
            ]);
        }
    };

    const inputExists = (nameInputText !== '' && nameInputText === placeholderCertName);

    return (
        <Modal
            visible={show}
            onDismiss={handleClose}
            header={t('DeleteCert') + '"' + placeholderCertName + '"?'}
        >
            {(
                <SpaceBetween size="m">
                    <FormField label={t("DeleteNote")}>
                        <ColumnLayout columns={1}>
                            <Input
                                placeholder={placeholderCertName}
                                onChange={event => setNameInputText(event.detail.value)}
                                value={nameInputText}
                                ariaRequired={true}
                            />
                        </ColumnLayout>
                    </FormField>
                    <Box float="right">
                        <SpaceBetween direction="horizontal" size="xs">
                            <Button variant="primary" disabled={!inputExists} data-testid="submit"
                                    onClick={handleDeleteCertSubmit}>
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

export default DeleteCertModal
