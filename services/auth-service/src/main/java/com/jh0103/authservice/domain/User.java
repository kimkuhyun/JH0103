package com.jh0103.authservice.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Builder;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@Entity
@Table(name = "users")
public class User{
    @ID
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = flase)
    private String email;

    @Column
    private String picture;

    @Column(nullable = false)
    private String provider;

    @Column(nullable = false)
    private String providerId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    @Builder
    public User(String name, String email, String picture, String provider, String providerId, Role role){
        this.name = name;
        this.email = email;
        this.picture = picture;
        this.provider = provider;
        this.providerId = providerId;
        this.role = role;
    }

    public User update(String name, String picture){
        this.name = name;
        this.picture = picture;
        return this;
    }

    public String getRoleKey(){
        return this.role.getKey();
    }


    
}