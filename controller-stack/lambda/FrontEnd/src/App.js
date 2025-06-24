import '@cloudscape-design/global-styles/index.css';
import React from 'react';
import './styles/base.scss';
import MainPage from "./components/MainPage";


class App extends React.Component {

    render() {
        return (
            <div className="App awsui-visual-refresh">
                <MainPage id="main-page"/>
            </div>
        );
    }
}


// createRoot(document.getElementById('app')).render(<App />);

export default App;