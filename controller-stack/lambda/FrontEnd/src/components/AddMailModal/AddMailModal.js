import React, {useEffect, useState} from "react";
import axios from "axios";
import {Box, Button, ColumnLayout, FormField, Input, Modal, SpaceBetween} from "@cloudscape-design/components";
import {t} from "i18next";
import Flashbar from "@cloudscape-design/components/flashbar";
import {useDispatch, useSelector} from 'react-redux';
import {setAddMailModal, setRefreshEmail} from "../../redux/actions";
import {v4 as uuidv4} from "uuid";

function AddEmailModal() {
    const data = useSelector(state => state.stateRedux.openAddMailModal)
    const show = data.show

    const email = 'email';
    const [TipsItems, setTipsItems] = React.useState([]);
    const [EmailInputText, setEmailInputText] = useState('');
    const apiToken = useSelector(state => state.stateRedux.apiToken)
    const dispatch = useDispatch();


    useEffect(() => {
        console.log("AddEmailModal->useEffect")
        console.log(apiToken)
        setEmailInputText('');
        setTipsItems([])
    }, [show]);

    const handleClose = () => {
        setTipsItems([])
        setEmailInputText('');
        dispatch(setRefreshEmail(uuidv4()))
        dispatch(setAddMailModal({
            show:false,
            project_name:null
        }))
    }

    const handleAddEmailSubmit = event => {
        event.preventDefault();
        setTipsItems([
            {
                type: "info",
                dismissible: false,
                dismissLabel: "Dismiss message",
                onDismiss: () => setTipsItems([]),
                content: (
                    <>
                        Adding Email Address
                    </>
                ),
            }
        ]);
        axios.post(
            './api/addemail',
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
            handleClose()
        }).catch(err => {
            console.log(err.response);
            setTipsItems([
                {
                    header: err.response.status + " - " + err.response.statusText,
                    type: "error",
                    content:err.response.data.message,
                    dismissible: true,
                    dismissLabel: "Dismiss message",
                    onDismiss: () => setTipsItems([]),
                }
            ])
        });
    };

    const inputExists = (EmailInputText !== '');
    return (
        <Modal
            visible={show}
            onDismiss={handleClose}
            header={t('AddEmail')}
        >
            {(
                <SpaceBetween size="m">
                    {}
                    {/*<form onSubmit={handleAddEmailSubmit}>*/}
                    <FormField label={t("EmailAddress")}>
                        <ColumnLayout columns={1}>
                            <Input
                                placeholder={email}
                                onChange={event => setEmailInputText(event.detail.value)}
                                value={EmailInputText}
                                ariaRequired={true}
                            />
                        </ColumnLayout>
                    </FormField>
                    <Box float="right">
                        <SpaceBetween direction="horizontal" size="xs">
                            <Button variant="primary" disabled={!inputExists} data-testid="submit"
                                    onClick={handleAddEmailSubmit}>
                                {t('Add')}
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


export default AddEmailModal
