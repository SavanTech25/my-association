import React, { useState } from "react";
import { handleLogin } from "../../controllers/controller.user";
import { useDispatch } from "react-redux";
import { Mail, Lock, LogIn } from "lucide-react";
import { toast } from "react-toastify";

export default function Login() {
    const [email, setEmail] = useState('');
    const [pwd, setPwd] = useState('');
    const [disable, setDisable] = useState(false);
    const dispatch = useDispatch();

    async function login(e) {
        e.preventDefault();
        if (!email || !pwd) {
            toast.warning("Veuillez remplir tous les champs");
            return;
        }
        
        setDisable(true);
        const res = await handleLogin(e, email, pwd);
        
        if (res !== -1) {
            dispatch(res);
            // We don't necessarily need reloadPage() if redux state triggers navigation
            // window.location.reload(); 
        }
        setDisable(false);
    }

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-header">
                    <div className="app-logo mb-3">
                        <div className="bg-primary rounded-3 d-inline-block p-3">
                            <span className="text-white h3 m-0">A</span>
                        </div>
                    </div>
                    <h1>Mon Asso</h1>
                    <p>Gérez votre association en toute simplicité</p>
                </div>

                <form onSubmit={login}>
                    <div className="form-group">
                        <label className="form-label">Adresse Email</label>
                        <div className="input-container">
                            <Mail className="input-icon" />
                            <input 
                                type="email" 
                                className="auth-input" 
                                placeholder="nom@exemple.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Mot de Passe</label>
                        <div className="input-container">
                            <Lock className="input-icon" />
                            <input 
                                type="password" 
                                className="auth-input" 
                                placeholder="••••••••"
                                value={pwd}
                                onChange={(e) => setPwd(e.target.value)}
                                required
                            />
                        </div>
                        <a href="/forgot" className="forgot-password">Mot de passe oublié ?</a>
                    </div>

                    <button type="submit" className="auth-button" disabled={disable}>
                        {disable ? (
                            <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        ) : (
                            <LogIn className="d-inline-block me-2" size={18} />
                        )}
                        Se connecter
                    </button>
                </form>

                {/* <div className="auth-footer">
                    Pas encore de compte ? <a href="/signin">Rejoindre l'Asso</a>
                </div> */}

                {/* Optional Social Login placeholders for better aesthetics */}
                {/* <div className="mt-4 pt-4 border-top border-secondary opacity-50">
                    <div className="d-flex justify-content-center gap-3">
                        <button className="btn btn-outline-light btn-sm rounded-circle p-2">
                            <Chrome size={16} />
                        </button>
                        <button className="btn btn-outline-light btn-sm rounded-circle p-2">
                            <Github size={16} />
                        </button>
                    </div>
                </div> */}
            </div>
        </div>
    );
}