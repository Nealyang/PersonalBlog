import render from '../lib/render';
import createElement from '../lib/createElement';

class Component { };

class HelloWorld extends Component {

     

    render() {
        return <div style={{ color: 'red' }}>Hello World
        <p style={{color:'blue'}} onClick={()=>alert('testFunc')}>testFunc</p>
        </div>
    }
}

// render('hello world',document.getElementById("root"));
// render(<div onClick={()=>alert(1)} style={{ color: 'red' }}>Nealyang<span>:</span><p style={{fontSize: '20px',color:'blue'}}> study react</p></div>, document.getElementById("root"));
render(<HelloWorld/>,document.getElementById("root"));