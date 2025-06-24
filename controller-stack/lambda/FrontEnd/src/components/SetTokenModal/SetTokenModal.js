import {Box, Button, ColumnLayout, FormField, Input, Modal, SpaceBetween} from "@cloudscape-design/components";
import {t} from "i18next";
import React, {useEffect, useState} from "react";
import {v4 as uuidv4} from 'uuid';
import {useDispatch, useSelector} from "react-redux";
import {openTokenModal, setApiToken, setRefreshProject} from "../../redux/actions";


function SetTokenModal() {

    const apiToken = useSelector(state => state.stateRedux.apiToken)
    const open = useSelector(state => state.stateRedux.openTokenModal)
    const dispatch = useDispatch();

    const [tokenInputText, setTokenInputText] = useState('');
    const inputExists = (tokenInputText !== '');

    const handleSetTokenSubmit = event => {
        console.log("handleSetTokenSubmit")
        dispatch(setApiToken(tokenInputText))
        dispatch(setRefreshProject(uuidv4()))
        dispatch(openTokenModal(false))
        // localStorage.setItem("apiKey", tokenInputText)
    }

    const handleClose = () => {
        console.log("handleSetTokenClose")
        setTokenInputText(apiToken)
        if(apiToken.length===0){
            dispatch(openTokenModal(true))
        }else{
            dispatch(openTokenModal(false))
        }
    }

    useEffect(() => {
        console.log("SetTokenModal->useEffect")
        if(apiToken.length===0){
            dispatch(openTokenModal(true))
        }else{
            dispatch(openTokenModal(false))
        }
    }, [apiToken]);

    return (
        <Modal
            visible={open}
            onDismiss={handleClose}
            header={t('SetToken')}
        >
            {(
                <SpaceBetween size="m">
                    <FormField label={t("InputToken")}>
                        <ColumnLayout columns={1}>
                            <Input
                                type="password"
                                placeholder={t('SetTokenPlaceholder')}
                                onChange={event => setTokenInputText(event.detail.value)}
                                value={tokenInputText}
                                ariaRequired={true}
                            />
                        </ColumnLayout>
                    </FormField>
                    <Box float="right">
                        <SpaceBetween direction="horizontal" size="xs">
                            <Button variant="primary" disabled={!inputExists} data-testid="submit"
                                    onClick={handleSetTokenSubmit}>
                                {t('InputToken')}
                            </Button>
                        </SpaceBetween>
                    </Box>
                </SpaceBetween>
            )}
        </Modal>
    );
}


export default SetTokenModal
